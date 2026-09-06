'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Awardee } from '@/lib/awardees-shared'
import { discoverNav } from '../_lib/navigation'
import { useDashboardMember } from '../_providers/dashboard-member'

type Story = { id: string; title: string; slug: string; excerpt: string; coverImage: string | null }
const campaigns = [
  { label: 'Volunteer with Top100', title: 'Put your skills to work.', description: 'Offer services or pledge cash support to the community.', action: 'Choose how to help', href: '/dashboard/discover/volunteer' },
  { label: 'Give back', title: 'Start something that matters.', description: 'Share your social impact initiative and how you can contribute.', action: 'Share my idea', href: '/dashboard/discover/give-back' },
  { label: 'Project100 · 2026', title: 'Help education go further.', description: 'Explore the Project100 Scholarship programme.', action: 'Learn more', href: '/initiatives/project100/scholarship' },
]

function Rail({ title, children, href }: { title: string; children: ReactNode; href?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  function scroll(direction: number) {
    ref.current?.scrollBy({ left: direction * ref.current.clientWidth * 0.85, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return <section>
    <div className="discover-section-heading"><h2>{title}</h2><div className="flex items-center gap-1">
      {href && <Link className="mr-2 text-xs underline underline-offset-4" href={href}>View all</Link>}
      <button type="button" aria-label={`Scroll ${title} left`} onClick={() => scroll(-1)}><ChevronLeft size={18} /></button>
      <button type="button" aria-label={`Scroll ${title} right`} onClick={() => scroll(1)}><ChevronRight size={18} /></button>
    </div></div>
    <div ref={ref} className="discover-rail" tabIndex={0} role="region" aria-label={`${title}, scroll horizontally`}>{children}</div>
  </section>
}

export function DiscoverFeed({ posts }: { posts: Story[] }) {
  const { member } = useDashboardMember()
  const [people, setPeople] = useState<Awardee[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setState('loading')
    fetch('/api/awardees', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Directory unavailable')
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Invalid directory')
      setPeople(data.filter((person: Awardee) => person.profile_id !== member.id).sort((a: Awardee, b: Awardee) => Number(Boolean(b.profile_id)) - Number(Boolean(a.profile_id))).slice(0, 8))
      setState('ready')
    }).catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => controller.abort()
  }, [member.id, retry])
  const canConnect = !['suspended', 'rejected'].includes(member.status)
  return <div className="discover-feed">
    <header><h1 className="text-xl font-semibold tracking-tight">Find your people. Make an impact.</h1></header>
    <nav aria-label="Discover shortcuts" className="discover-shortcuts">
      {discoverNav.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={18} /><span>{label}</span><ArrowUpRight size={14} /></Link>)}
    </nav>
    <Link href="/partnership" className="discover-ad" aria-label="Top100 promotion: Build Africa’s next chapter. Partner with us.">
      <img src="/dashboard/community-ad.png" alt="" />
      <div><span>Top100 promotion</span><h2>Build Africa’s<br />next chapter.</h2><p>Partner with us <ArrowUpRight size={16} /></p></div>
    </Link>
    <Rail title="Make a difference">
      {campaigns.map(campaign => <Link href={campaign.href} className="discover-campaign" key={campaign.label}><span className="discover-kicker">{campaign.label}</span><h3>{campaign.title}</h3><p>{campaign.description}</p><span className="discover-cta">{campaign.action} <ArrowUpRight size={18} /></span></Link>)}
    </Rail>
    <Rail title="People to meet" href="/dashboard/discover/members">
      {state === 'loading' && <p className="discover-empty" role="status">Loading members…</p>}
      {state === 'error' && <div className="discover-empty" role="status">Members couldn’t load. <button className="underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
      {state === 'ready' && !people.length && <p className="discover-empty">Explore the <Link href="/dashboard/discover/members" className="underline">member directory</Link> to meet fellow awardees.</p>}
      {state === 'ready' && people.map(person => <article className="discover-person" key={person.slug}>
        <Link href={`/awardees/${person.slug}`} className="discover-person-profile">
          {person.avatar_url ? <img src={person.avatar_url} alt="" loading="lazy" className="discover-avatar" /> : <span className="discover-avatar">{person.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>}
          <h3>{person.name}</h3><p>{person.headline || person.country || 'Africa Future Leader'}</p>
        </Link>
        {canConnect && person.profile_id ? <Link className="discover-connect" aria-label={`Connect with ${person.name} by message`} href={`/dashboard/messages?to=${encodeURIComponent(person.profile_id)}&name=${encodeURIComponent(person.name)}`}>Connect <ArrowUpRight size={14} /></Link> : <Link className="discover-connect" href={`/awardees/${person.slug}`}>View profile <ArrowUpRight size={14} /></Link>}
      </article>)}
    </Rail>
    <Rail title="Stories & ideas" href="/blog">
      {posts.length ? posts.map(post => <Link className="discover-story" href={`/blog/${post.slug}`} key={post.id}>
        {post.coverImage && <img src={post.coverImage} alt="" loading="lazy" />}
        <div><h3>{post.title}</h3><span className="discover-cta">Read story <ArrowUpRight size={16} /></span></div>
      </Link>) : <p className="discover-empty">New stories will appear here when published.</p>}
    </Rail>
  </div>
}
