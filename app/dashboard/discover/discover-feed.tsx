'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import SafeImage from '@/components/safe-image'
import type { DirectoryCard } from '@/lib/awardees/directory-cards'
import { fetchPublicDirectory, peekPublicDirectory } from '@/lib/awardees/directory-client'
import { DashboardLoading } from '../_components/dashboard-loading'
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

function PersonCard({ person }: { person: DirectoryCard }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const initials = person.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()

  return <Link
    href={`/awardees/${person.slug}`}
    aria-label={`View ${person.name}'s profile`}
    className="discover-person"
  >
    <div className="discover-person-profile">
      {person.avatar_url && !avatarFailed
        ? <SafeImage
            src={person.avatar_url}
            alt=""
            loading="lazy"
            decoding="async"
            width={168}
            height={224}
            className="discover-avatar"
            onError={() => setAvatarFailed(true)}
          />
        : <span className="discover-avatar discover-avatar--fallback" aria-hidden="true">{initials || 'A'}</span>}
      <h3>{person.name}</h3>
    </div>
  </Link>
}

export function DiscoverFeed({ posts }: { posts: Story[] }) {
  const { member } = useDashboardMember()
  const [people, setPeople] = useState<DirectoryCard[]>(() => peekPublicDirectory() ?? [])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>(() => peekPublicDirectory() ? 'ready' : 'loading')
  const [retry, setRetry] = useState(0)
  const [rotationWindow] = useState(() => Math.floor(Date.now() / (1000 * 60 * 60 * 24)))
  const stories = shuffleForMember(posts, member.id, rotationWindow)
  const shortcutItems = discoverNav.map(item => item.label === 'Saved'
    ? { ...item, label: 'Award', title: 'My award', href: '/dashboard/me/award', icon: Trophy }
    : item)
  useEffect(() => {
    let cancelled = false
    fetchPublicDirectory(retry > 0).then(data => {
      if (cancelled) return
      // Exclude the signed-in member and keep every card publicly resolvable.
      const candidates = data.filter((person: DirectoryCard) =>
        person.profile_id !== member.id &&
        person.is_public !== false &&
        typeof person.slug === 'string' &&
        person.slug.trim().length > 0,
      )
      setPeople(shuffleForMember(candidates, member.id, rotationWindow).slice(0, 8))
      setState('ready')
    }).catch(() => { if (!cancelled) setState('error') })
    return () => { cancelled = true }
  }, [member.id, retry, rotationWindow])
  return <div className="discover-feed">
    <Link href="/dashboard/discover/groups" className="discover-advert" aria-label="Find your WhatsApp group and connect with Africa Future Leaders">
      <div className="discover-advert__copy">
        <p>Your people are here</p>
        <h2>Find your community.</h2>
        <span>Discover your group <ArrowUpRight size={14} aria-hidden="true" /></span>
      </div>
      <div className="discover-advert__art" aria-hidden="true">
        <i /><i /><i />
        <SafeImage src="/illustrations/discover-community.svg" alt="" width={160} height={160} />
      </div>
    </Link>
    <header><h1 className="text-xl font-semibold tracking-tight">Find your people. Make an impact.</h1></header>
    <nav aria-label="Discover shortcuts" className="discover-shortcuts">
      {shortcutItems.map(({ href, label, icon: Icon }) =>
        <Link key={href} href={href}><Icon size={18} /><span>{label}</span><ArrowUpRight size={14} /></Link>)}
    </nav>
    <Rail title="Make a difference">
      {campaigns.map(campaign => <Link href={campaign.href} className="discover-campaign" key={campaign.label}><span className="discover-kicker">{campaign.label}</span><h3>{campaign.title}</h3><p>{campaign.description}</p><span className="discover-cta">{campaign.action} <ArrowUpRight size={18} /></span></Link>)}
    </Rail>
    <Rail title="People to meet" href="/dashboard/discover/members">
      {state === 'loading' && <DashboardLoading label="Loading members" compact />}
      {state === 'error' && <div className="discover-empty" role="status">Members couldn’t load. <button className="underline" onClick={() => { setState('loading'); setRetry(value => value + 1) }}>Try again</button></div>}
      {state === 'ready' && !people.length && <p className="discover-empty">Explore the <Link href="/dashboard/discover/members" className="underline">member directory</Link> to meet fellow awardees.</p>}
      {state === 'ready' && people.filter(person => person.profile_id !== member.id).slice(0, 8).map(person => <PersonCard person={person} key={person.slug} />)}
    </Rail>
    <Rail title="Stories & ideas" href="/blog">
      {stories.length ? stories.map((post, index) => <Link className="discover-story" href={`/blog/${post.slug}`} key={post.id}>
        <img src={resolveStoryCover(post, index)} alt={`${post.title} cover image`} loading="lazy" />
        <div><h3>{post.title}</h3><span className="discover-cta">Read story <ArrowUpRight size={16} /></span></div>
      </Link>) : <p className="discover-empty">New stories will appear here when published.</p>}
    </Rail>
  </div>
}
