'use client'

import Link from 'next/link'
import Image from '@/components/safe-image'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Mail,
  MessageCircle,
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
import { meNav } from '../_lib/navigation'
import { selectUpcomingInvitations } from '../_lib/home-priority'
import { useDashboardMember } from '../_providers/dashboard-member'
import { dashboardCelebrationStorageKey } from '@/lib/dashboard/celebration'
import { AwardeeOnboardingJourney } from './awardee-onboarding-journey'
import { DashboardCelebration } from './dashboard-celebration'
import { AflCalendarAnnouncement } from './afl-calendar-announcement'
import MagazinePopup from '@/app/components/MagazinePopup'
import { FestivalCard } from './festival-card'

const INTERVIEW_FORM_URL = '/dashboard/me/interview'
const PARTNERSHIP_FORM_URL = 'https://docs.google.com/forms/d/1pabeSUOwN15Sr-VcAWIhl5k5_xwnKljFuzm90PCoEqQ/edit'

const launchBanners = [
  { title: 'Project100 Scholarship', description: 'Join your group. Keep a child in school.', href: '/dashboard/me/project100-scholarship', image: '/dashboard/banners/project100-scholarship-roadside.png' },
  { title: 'Impact Series Interviews', description: 'Share the work behind your impact.', href: INTERVIEW_FORM_URL, image: '/dashboard/banners/impact-series-v2.png' },
  { title: 'Let your organization partner with Africa Future Leaders', description: 'Create more impact together.', href: PARTNERSHIP_FORM_URL, image: '/dashboard/banners/impact-series-v2.png', external: true },
] as const

const shortcutDescriptions: Record<string, string> = {
  Members: 'Meet fellow awardees',
  Profile: 'Keep your BIO current',
  'Past sessions': 'Revisit recordings, workshops, and previous courses',
  'Portfolio cover': 'Create your magazine profile',
  Posts: 'Write in your own words',
  'Get featured': 'Share your work with the team',
  'Apply for magazine': 'Share the story behind your leadership',
  'Schedule an interview': 'Request an interview time',
  'Contact Top100': 'Chat with the Top100 team on WhatsApp',
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
  const { member, dashboardVisitReady } = useDashboardMember()
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [programmeEvents, setProgrammeEvents] = useState<LiveCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [nextSessionOpen, setNextSessionOpen] = useState(false)

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

  const shortcuts = [meNav[2],
    { label:'Past sessions', href:'/dashboard/discover/event-videos', icon:Video, color:'charcoal' as const },
    { label:'Apply for magazine', href:'/magazine/feature', icon:Mail, color:'burgundy' as const },
    { label:'Schedule an interview', href:INTERVIEW_FORM_URL, icon:Mail, color:'ember' as const },
    { label:'Contact Top100', href:'https://wa.link/2349131866959', icon:MessageCircle, color:'forest' as const, external:true },
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

  const nextSession = comingUp.find((event) => event.sortAt >= now) ?? null
  const loginCount = member.dashboardLoginCount ?? 0
  const nextSessionPopupKey = `afl:next-session-popup:${member.id}:${loginCount}`

  useEffect(() => {
    if (!dashboardVisitReady || loginCount < 1 || !nextSession) return
    let cancelled = false
    const showIfReady = () => {
      if (cancelled) return
      try {
        if (window.localStorage.getItem(nextSessionPopupKey) === 'true') return
        if (loginCount === 1 && window.localStorage.getItem(dashboardCelebrationStorageKey(member.id)) !== 'true') return
      } catch {
        // Continue showing the next session when browser storage is unavailable.
      }
      setNextSessionOpen(true)
    }

    showIfReady()
    window.addEventListener('afl:dashboard-celebration-dismissed', showIfReady)
    return () => {
      cancelled = true
      window.removeEventListener('afl:dashboard-celebration-dismissed', showIfReady)
    }
  }, [dashboardVisitReady, loginCount, member.id, nextSession?.id, nextSessionPopupKey])

  const dismissNextSession = () => {
    setNextSessionOpen(false)
    try { window.localStorage.setItem(nextSessionPopupKey, 'true') } catch { /* Dismiss for this dashboard visit. */ }
  }

  const nextSessionWhen = nextSession?.startAt
    ? new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(nextSession.startAt))
    : 'Date and time to be announced'
  const nextSessionTime = nextSession?.startAt
    ? `${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(nextSession.startAt))}${nextSession.endAt ? `–${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(nextSession.endAt))}` : ''} WAT (Lagos)`
    : null

  return (
    <div className="hub-home">
      <MagazinePopup member={member} />
      <DashboardCelebration
        memberId={member.id}
        name={member.name}
        dashboardLoginCount={member.dashboardLoginCount ?? 0}
      />
      {nextSession ? <Dialog open={nextSessionOpen} onOpenChange={(open) => { if (!open) dismissNextSession(); else setNextSessionOpen(true) }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[20px] border-0 bg-white p-0 shadow-2xl" overlayClassName="bg-black/75 backdrop-blur-sm" aria-describedby="next-session-description">
          {nextSession.cover ? <div className="grid max-h-[36dvh] place-items-center overflow-hidden bg-[#FFC528]">
            <Image src={nextSession.cover} alt={`${nextSession.title} session poster`} width={1755} height={2194} className="mx-auto max-h-[36dvh] w-auto max-w-full object-contain" />
          </div> : <div className="relative grid min-h-[220px] place-items-center overflow-hidden bg-[linear-gradient(135deg,#17344c,#0c2033)] px-6 py-8 text-center text-white">
            <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-[#F6CF5C]/15" aria-hidden="true" />
            <div className="relative max-w-sm">
              <CalendarDays className="mx-auto h-9 w-9 text-[#F6CF5C]" aria-hidden="true" />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#F6CF5C]">Next scheduled session</p>
              <p className="mt-2 text-xl font-semibold leading-tight">{nextSession.title}</p>
              <p className="mt-2 text-sm text-white/80">{nextSessionWhen}</p>
            </div>
          </div>}
          <div className="p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A6440D]">Your next session · {nextSession.detail}</p>
            <DialogTitle className="mt-2 text-xl font-semibold leading-tight tracking-tight text-[#171412]">{nextSession.title}</DialogTitle>
            <DialogDescription id="next-session-description" className="mt-3 text-sm leading-6 text-[#625B52]">
              {nextSessionWhen}{nextSessionTime ? <><br />{nextSessionTime}</> : null}
              {nextSession.summary ? <><br /><br />{nextSession.summary}</> : null}
            </DialogDescription>
            <div className="mt-4 grid gap-2">
              {nextSession.meetUrl ? <a href={nextSession.meetUrl} target="_blank" rel="noopener noreferrer" onClick={dismissNextSession} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FF9D00] px-4 text-sm font-semibold text-[#171412] hover:bg-[#FFB329] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"><Video size={18} aria-hidden="true" />Join on Google Meet<ArrowUpRight size={16} aria-hidden="true" /></a> : null}
              {nextSession.startAt ? <a href={AFL_2026_CALENDAR.addUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E9D6C5] px-4 text-sm font-semibold text-[#84330B] hover:bg-[#FFF8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"><CalendarPlus size={18} aria-hidden="true" />Add to Google Calendar<ArrowUpRight size={16} aria-hidden="true" /></a> : null}
            </div>
          </div>
        </DialogContent>
      </Dialog> : null}
      <AflCalendarAnnouncement memberId={member.id} dashboardLoginCount={member.dashboardLoginCount ?? 0} />
      <FestivalCard />
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
              <span className="relative z-10 min-w-0 self-end text-white">
                <span className="line-clamp-4 block break-words text-[13px] font-semibold leading-4 text-white">{item.title}</span>
                <span className="mt-1 block text-[11px] font-medium leading-4 text-white/90">{item.date}</span>
              </span>
            </>
            const cardClass = "hub-upcoming-event text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            return item.cover ? <Dialog key={item.id}>
              <DialogTrigger asChild>
                <button type="button" className={cardClass} style={{ backgroundImage: `linear-gradient(180deg, rgba(124,45,8,.12) 15%, rgba(124,45,8,.9) 100%), url(${item.cover})` }} aria-label={`Preview ${item.title}`}>{cardContent}</button>
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
                    {item.startAt ? <a href={AFL_2026_CALENDAR.addUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E9D6C5] px-4 text-sm font-semibold text-[#84330B] hover:bg-[#FFF8F0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"><CalendarPlus size={18} aria-hidden="true" />Add to Google Calendar<ArrowUpRight size={16} aria-hidden="true" /></a> : null}
                  </div>
                  {item.startAt ? <p className="mt-2 text-center text-xs leading-5 text-[#625B52]">Opens the Africa Future Leaders calendar in Google Calendar.</p> : null}
                </div>
              </DialogContent>
            </Dialog> : <Link key={item.id} href={item.href} target={item.href.startsWith('https://') ? '_blank' : undefined} rel={item.href.startsWith('https://') ? 'noopener noreferrer' : undefined} className={cardClass}>{cardContent}</Link>
          }) : loading ? <DashboardLoading label="Loading events" compact /> : loadError ? null : (
            <div className="py-3"><p className="text-sm text-[#625B52]">No upcoming events yet.</p><Link className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-[#171717]" href="/dashboard/discover/events">View events <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          )}
        </div>
      </section>

      <Link href="/dashboard/discover/groups" className="discover-advert discover-advert--whatsapp" aria-label="Find your WhatsApp group and connect with Africa Future Leaders">
        <div className="discover-advert__copy">
          <p>Your people are here</p>
          <h2>Find your community.</h2>
          <span>Discover your group <ArrowUpRight size={14} aria-hidden="true" /></span>
        </div>
        <div className="discover-advert__art" aria-hidden="true">
          <svg viewBox="0 0 64 64" focusable="false">
            <circle cx="32" cy="32" r="27" fill="#fff" />
            <path fill="#075e54" d="M32 5C17.1 5 5 17 5 31.8c0 4.8 1.3 9.4 3.7 13.5L5 59l14.1-3.7A27 27 0 1 0 32 5Zm0 48.7c-4.2 0-8.3-1.1-11.9-3.4l-.9-.5-8.4 2.2 2.2-8.2-.6-1A21.5 21.5 0 1 1 32 53.7Z" />
            <path fill="#075e54" d="M43.8 37.3c-.7-.4-4-2-4.7-2.2-.6-.2-1.1-.4-1.5.4-.5.7-1.8 2.2-2.2 2.7-.4.5-.8.5-1.5.2-.7-.4-2.9-1.1-5.5-3.4-2-1.8-3.4-4-3.8-4.7-.4-.7 0-1.1.3-1.4.3-.3.7-.8 1.1-1.2.4-.4.5-.7.7-1.1.2-.5.1-.9 0-1.2-.2-.4-1.5-3.6-2.1-4.9-.5-1.2-1.1-1-1.5-1h-1.3c-.5 0-1.2.2-1.8.9-.6.7-2.4 2.3-2.4 5.5s2.5 6.4 2.8 6.9c.4.5 4.8 7.4 11.6 10.4 1.6.7 2.8 1.1 3.8 1.4 1.6.5 3 .4 4.1.2 1.3-.2 4-1.6 4.6-3.2.6-1.6.6-2.9.4-3.2-.2-.3-.6-.5-1.3-.8Z" />
          </svg>
        </div>
      </Link>

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
