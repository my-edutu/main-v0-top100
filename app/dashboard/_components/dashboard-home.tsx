'use client'

import Link from 'next/link'
import Image from '@/components/safe-image'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarPlus,
  Mail,
  Video,
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

function downloadCalendarEvent(event: { title: string; startAt: string | null; endAt: string | null; summary: string | null; meetUrl: string | null }) {
  if (!event.startAt) return
  const escapeIcs = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const toUtc = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const start = new Date(event.startAt)
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000)
  const description = [event.summary, event.meetUrl ? `Google Meet: ${event.meetUrl}` : null].filter(Boolean).join('\n\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Africa Future Leaders//Programme Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@top100afl.com`,
    `DTSTAMP:${toUtc(new Date().toISOString())}`,
    `DTSTART:${toUtc(event.startAt)}`,
    `DTEND:${toUtc(end.toISOString())}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    ...(description ? [`DESCRIPTION:${escapeIcs(description)}`] : []),
    ...(event.meetUrl ? [`URL:${event.meetUrl}`, `LOCATION:${event.meetUrl}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
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
        startAt: invitation.event?.startAt ?? null,
        endAt: null,
        meetUrl: null,
        summary: invitation.event?.summary ?? null,
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
        startAt: event.startAt,
        endAt: event.endAt,
        meetUrl: event.meetUrl,
        summary: null,
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
          {comingUp.length > 0 ? comingUp.map((item) => {
            const cardContent = <>
              <span className="hub-upcoming-event-label relative z-10 self-start">{item.detail}</span>
              <span className="relative z-10 min-w-0 self-end text-white">
                <span className="block break-words text-sm font-semibold text-white">{item.title}</span>
                <span className="mt-2 block text-xs font-medium text-white/90">{item.date}</span>
              </span>
            </>
            const cardClass = "hub-upcoming-event text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            return item.cover ? <Dialog key={item.id}>
              <DialogTrigger asChild>
                <button type="button" className={cardClass} style={{ backgroundImage: `linear-gradient(180deg, rgba(12,12,16,.08) 15%, rgba(12,12,16,.88) 100%), url(${item.cover})` }} aria-label={`Preview ${item.title}`}>{cardContent}</button>
              </DialogTrigger>
              <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-[18px] border-0 bg-white p-0" overlayClassName="bg-black/75 backdrop-blur-sm" aria-describedby={undefined}>
                <div className="bg-[#FFC528]">
                  <Image src={item.cover} alt={`${item.title} event poster`} width={1755} height={2194} className="mx-auto max-h-[45dvh] w-auto max-w-full object-contain" />
                </div>
                <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#A6440D]">{item.detail}</p>
                  <DialogTitle className="text-xl font-semibold leading-7 text-[#171412]">{item.title}</DialogTitle>
                  {item.startAt ? <p className="mt-3 text-sm leading-6 text-[#625B52]">
                    {new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(item.startAt))}
                    <br />
                    {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(item.startAt))}
                    {item.endAt ? `–${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(item.endAt))}` : ''} WAT (Lagos)
                  </p> : null}
                  {item.summary ? <p className="mt-3 text-sm leading-6 text-[#625B52]">{item.summary}</p> : null}
                  <div className="mt-4 grid gap-2">
                    {item.meetUrl ? <a href={item.meetUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF9D00] px-4 text-sm font-semibold text-[#171412] hover:bg-[#FFB329] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"><Video size={18} aria-hidden="true" />Join on Google Meet<ArrowUpRight size={16} aria-hidden="true" /></a> : null}
                    {item.startAt ? <button type="button" onClick={() => downloadCalendarEvent(item)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E9D6C5] px-4 text-sm font-semibold text-[#84330B] hover:bg-[#FFF8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"><CalendarPlus size={18} aria-hidden="true" />Add to calendar</button> : null}
                  </div>
                  {item.startAt ? <p className="mt-2 text-center text-xs leading-5 text-[#625B52]">Calendar file for Apple Calendar, Google Calendar, and Android calendar apps.</p> : null}
                </div>
              </DialogContent>
            </Dialog> : <Link key={item.id} href={item.href} target={item.href.startsWith('https://') ? '_blank' : undefined} rel={item.href.startsWith('https://') ? 'noopener noreferrer' : undefined} className={cardClass}>{cardContent}</Link>
          }) : loading ? <DashboardLoading label="Loading events" compact /> : loadError ? null : (
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
