'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import type { Awardee } from '@/lib/awardees-shared'
import { resolveStoryCover } from '@/lib/story-covers'
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

function seedFromString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * Keep the rail stable for a member during a rotation window while giving
 * different members a different order. A daily window means returning members
 * see a fresh set over time without causing cards to jump on every render.
 */
function shuffleForMember<T>(items: T[], memberId: string, rotationWindow: number) {
  const shuffled = [...items]
  let seed = seedFromString(`${memberId}:${rotationWindow}`)
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed ^ (seed >>> 16), 2246822519) + 3266489917) >>> 0
    const swapIndex = seed % (index + 1)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export function DiscoverFeed({ posts }: { posts: Story[] }) {
  const { member } = useDashboardMember()
  const [people, setPeople] = useState<Awardee[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [rotationWindow] = useState(() => Math.floor(Date.now() / (1000 * 60 * 60 * 24)))
  const stories = shuffleForMember(posts, member.id, rotationWindow)
  const shortcutItems = discoverNav.map(item => item.label === 'Saved'
    ? { ...item, label: 'Award', title: 'My award', href: '/dashboard/me/award', icon: Trophy }
    : item)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/awardees', { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Directory unavailable')
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Invalid directory')
      // The directory API also serves admin screens and therefore includes
      // private/hidden records. Discover is a public-facing surface: only
      // link to entries that the public profile route can actually resolve.
      // Without this guard, hidden awardees appeared in the rail and their
      // cards opened the public "Awardee not found" state.
      const candidates = data.filter((person: Awardee) =>
        person.profile_id !== member.id &&
        person.is_public !== false &&
        typeof person.slug === 'string' &&
        person.slug.trim().length > 0,
      )
      setPeople(shuffleForMember(candidates, member.id, rotationWindow).slice(0, 8))
      setState('ready')
    }).catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => controller.abort()
  }, [member.id, retry, rotationWindow])
  return <div className="discover-feed">
    <header><h1 className="text-xl font-semibold tracking-tight">Find your people. Make an impact.</h1></header>
    <nav aria-label="Discover shortcuts" className="discover-shortcuts">
      {shortcutItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={18} /><span>{label}</span><ArrowUpRight size={14} /></Link>)}
    </nav>
    <Rail title="Make a difference">
      {campaigns.map(campaign => <Link href={campaign.href} className="discover-campaign" key={campaign.label}><span className="discover-kicker">{campaign.label}</span><h3>{campaign.title}</h3><p>{campaign.description}</p><span className="discover-cta">{campaign.action} <ArrowUpRight size={18} /></span></Link>)}
    </Rail>
    <Rail title="People to meet" href="/dashboard/discover/members">
      {state === 'loading' && <p className="discover-empty" role="status">Loading members…</p>}
      {state === 'error' && <div className="discover-empty" role="status">Members couldn’t load. <button className="underline" onClick={() => { setState('loading'); setRetry(value => value + 1) }}>Try again</button></div>}
      {state === 'ready' && !people.length && <p className="discover-empty">Explore the <Link href="/dashboard/discover/members" className="underline">member directory</Link> to meet fellow awardees.</p>}
      {state === 'ready' && people.map(person => <Link href={`/awardees/${person.slug}`} aria-label={`View ${person.name}'s profile`} className="discover-person" key={person.slug}>
        <div className="discover-person-profile">
          {person.avatar_url ? <img src={person.avatar_url} alt="" loading="lazy" className="discover-avatar" /> : <span className="discover-avatar">{person.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</span>}
          <h3>{person.name}</h3>
        </div>
      </Link>)}
    </Rail>
    <Rail title="Stories & ideas" href="/blog">
      {stories.length ? stories.map((post, index) => <Link className="discover-story" href={`/blog/${post.slug}`} key={post.id}>
        <img src={resolveStoryCover(post, index)} alt={`${post.title} cover image`} loading="lazy" />
        <div><h3>{post.title}</h3><span className="discover-cta">Read story <ArrowUpRight size={16} /></span></div>
      </Link>) : <p className="discover-empty">New stories will appear here when published.</p>}
    </Rail>
  </div>
}
