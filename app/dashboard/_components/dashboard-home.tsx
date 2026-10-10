'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Mail,
  UserRound,
} from 'lucide-react'

import {
  fetchEventInvitations,
  type EventInvitation,
} from '@/lib/events/invitations-client'
import { fetchLiveCalendarEvents } from '@/lib/events/live-calendar-client'
import type { LiveCalendarEvent } from '@/lib/events/live-calendar'
import { AFL_2026_CALENDAR } from '@/lib/events/afl-2026-calendar'
import { DashboardLoading } from './dashboard-loading'
import { DashboardCard } from './dashboard-card'
import { discoverNav, meNav } from '../_lib/navigation'
import { selectUpcomingInvitations } from '../_lib/home-priority'
import { useDashboardMember } from '../_providers/dashboard-member'
import { AwardeeOnboardingJourney } from './awardee-onboarding-journey'
import { DashboardCelebration } from './dashboard-celebration'
import { AflCalendarAnnouncement } from './afl-calendar-announcement'

const INTERVIEW_FORM_URL = '/dashboard/me/interview'
const PARTNERSHIP_FORM_URL = 'https://docs.google.com/forms/d/1pabeSUOwN15Sr-VcAWIhl5k5_xwnKljFuzm90PCoEqQ/edit'

const launchBanners = [
  { title: 'Project100 Scholarship', description: 'Put your next chapter in motion.', href: '/dashboard/me/project100-scholarship', image: '/dashboard/banners/project100-scholarship-v2.png' },
  { title: 'Impact Series Interviews', description: 'Share the work behind your impact.', href: INTERVIEW_FORM_URL, image: '/dashboard/banners/impact-series-v2.png' },
  { title: 'Let your organization partner with Africa Future Leaders', description: 'Create more impact together.', href: PARTNERSHIP_FORM_URL, image: '/dashboard/banners/impact-series-v2.png', external: true },
] as const

const shortcutDescriptions: Record<string, string> = {
  Members: 'Meet fellow awardees',
  Opportunities: 'Find your next opening',
  Profile: 'Keep your BIO current',
  'My award': 'Pay your award fee securely',
  'Portfolio cover': 'Create your magazine profile',
  Posts: 'Write in your own words',
  'Get featured': 'Share your work with the team',
  'Schedule an interview': 'Request an interview time',
  'Contact the team': 'Ask a question or get support',
  'Partner with us': 'Explore working together',
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Date to be announced'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date to be announced'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date)
}

export function DashboardHome() {
  const { member } = useDashboardMember()
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [programmeEvents, setProgrammeEvents] = useState<LiveCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    async function loadPreviews() {
      if (inFlight) return
      inFlight = true
      const [invitationResult, programmeResult] =
        await Promise.allSettled([
          fetchEventInvitations(),
          fetchLiveCalendarEvents(),
        ])

      inFlight = false
      if (cancelled) return
      setLoading(false)
      setNow(Date.now())
      setLoadError([invitationResult, programmeResult].some(result => result.status === 'rejected'))

      if (invitationResult.status === 'fulfilled') {
        setInvitations(invitationResult.value.invitations)
      }

      if (programmeResult.status === 'fulfilled') {
        setProgrammeEvents(programmeResult.value)
      }

    }

    void loadPreviews()
    let timeout = 0
    const scheduleRefresh = () => {
      timeout = window.setTimeout(() => {
        if (!document.hidden) void loadPreviews()
        scheduleRefresh()
      }, 240_000 + Math.floor(Math.random() * 120_000))
    }
    scheduleRefresh()

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  const shortcuts = [discoverNav[0], discoverNav[2], meNav[0], meNav[2], meNav[4],
    { label:'Schedule an interview', href:INTERVIEW_FORM_URL, icon:Mail, color:'ember' as const },
    { label:'Contact the team', href:'mailto:info@top100afl.com', icon:Mail, color:'forest' as const },
    { label:'Partner with us', href:'/partnership', icon:UserRound, color:'cobalt' as const },
  ]

  const comingUp = useMemo(() => {
    const datedInvitations = selectUpcomingInvitations(invitations)
      .map((invitation) => ({
        id: `invitation-${invitation.id}`,
        title: invitation.event?.title ?? 'Member event',
        detail:
          invitation.rsvp === 'pending'
            ? 'Your RSVP is waiting'
            : `RSVP: ${invitation.rsvp}`,
        date: formatShortDate(invitation.event?.startAt),
        sortAt: invitation.event?.startAt ? Date.parse(invitation.event.startAt) : Number.POSITIVE_INFINITY,
        cover: invitation.event?.cover ?? null,
        href: '/dashboard/discover/events',
      }))

    const programmePreviews = programmeEvents
      .filter((event) => new Date(event.endAt).getTime() >= now)
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())
      .map((event) => ({
        id: `programme-${event.id}`,
        title: event.title,
        detail: event.cover ? 'Onboarding' : 'Live calendar',
        date: formatShortDate(event.startAt),
        sortAt: Date.parse(event.startAt),
        cover: event.cover,
        href: AFL_2026_CALENDAR.viewUrl,
      }))

    return [...datedInvitations, ...programmePreviews]
      .sort((left, right) => left.sortAt - right.sortAt)
      .slice(0, 6)
  }, [invitations, programmeEvents, now])

  return (
    <div className="hub-home">
      <DashboardCelebration
        memberId={member.id}
        name={member.name}
        dashboardLoginCount={member.dashboardLoginCount ?? 0}
      />
      <AflCalendarAnnouncement memberId={member.id} dashboardLoginCount={member.dashboardLoginCount ?? 0} />
      <section className="hub-welcome" aria-labelledby="hub-welcome-title">
        <h1 id="hub-welcome-title">{(member.dashboardLoginCount ?? 0) < 4 ? 'Congratulations' : 'Hey'}, {member.name.trim().split(/\s+/)[0]}.</h1>
        <p className="hub-welcome-description">Your people and opportunities.</p>
      </section>
      <AwardeeOnboardingJourney name={member.name} />
      {loadError && <p role="status" className="hub-status rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm leading-5 text-neutral-700">Some events couldn’t load. We’ll retry automatically; you can also open Events directly.</p>}

      <section aria-labelledby="coming-up-title" className="hub-upcoming-events min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="coming-up-title" className="hub-panel-title">Upcoming events</h2>
          </div>
          <Link href="/dashboard/discover/events" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#8e3a12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">
            See more <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="hub-events-rail mt-3" tabIndex={0} role="region" aria-label="Upcoming events, scroll horizontally">
          {comingUp.length > 0 ? comingUp.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              target={item.href.startsWith('https://') ? '_blank' : undefined}
              rel={item.href.startsWith('https://') ? 'noopener noreferrer' : undefined}
              className="hub-upcoming-event focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
              style={item.cover ? { backgroundImage: `linear-gradient(180deg, rgba(12,12,16,.08) 15%, rgba(12,12,16,.88) 100%), url(${item.cover})` } : undefined}
            >
              <span className="hub-upcoming-event-label relative z-10 self-start">{item.detail}</span>
              <span className="relative z-10 min-w-0 self-end text-white">
                <span className="block break-words text-sm font-semibold text-white">{item.title}</span>
                <span className="mt-2 block text-xs font-medium text-white/90">{item.date}</span>
              </span>
            </Link>
          )) : loading ? <DashboardLoading label="Loading events" compact /> : loadError ? null : (
            <div className="py-3"><p className="text-sm text-[#625B52]">No upcoming events yet.</p><Link className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-[#171717]" href="/dashboard/discover/events">View events <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          )}
        </div>
      </section>

      <section className="hub-launch-rail min-w-0" aria-labelledby="launch-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="launch-title" className="hub-panel-title mt-1">Keep going</h2>
          </div>
        </div>
        <div className="flex snap-x gap-4 overflow-x-auto pb-2 pr-2" role="region" aria-label="Featured member actions">
          {launchBanners.map((banner) => (
            <Link
              key={banner.title}
              href={banner.href}
              target={'external' in banner && banner.external ? '_blank' : undefined}
              rel={'external' in banner && banner.external ? 'noopener noreferrer' : undefined}
              className="group relative isolate flex min-h-[176px] min-w-[min(82vw,320px)] snap-start overflow-hidden rounded-[20px] border border-black/10 bg-black p-4 text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            >
              <img src={banner.image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-[#111827]/75 via-[#111827]/15 to-transparent" />
              <span className="mt-auto max-w-[290px]">
                <span style={{ color: '#fff' }} className="mt-1 block text-lg font-semibold leading-tight [text-shadow:0_1px_3px_rgba(0,0,0,.45)]">{banner.title}</span>
                <span style={{ color: 'rgba(255,255,255,.9)' }} className="mt-1 block text-sm [text-shadow:0_1px_2px_rgba(0,0,0,.45)]">{banner.description}</span>
              </span>
              <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-white/80 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      <section className="hub-shortcuts" aria-labelledby="shortcuts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="shortcuts-title" className="hub-panel-title">Explore more</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {shortcuts.map((item) => (
            <DashboardCard
              image={false}
              key={item.href}
              href={item.href}
              title={item.label}
              description={shortcutDescriptions[item.label]}
              icon={item.icon}
              color={item.color}
              external={(item as { external?: boolean }).external}
              compact
            />
          ))}
        </div>
      </section>

    </div>
  )
}
