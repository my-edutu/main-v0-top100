'use client'

import Image from '@/components/safe-image'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Mail,
  MessageCircle,
  Video,
  UserRound,
  Truck,
} from 'lucide-react'

import {
  fetchEventInvitations,
  type EventInvitation,
} from '@/lib/events/invitations-client'
import { fetchLiveCalendarEvents } from '@/lib/events/live-calendar-client'
import type { LiveCalendarEvent } from '@/lib/events/live-calendar'
import { AFL_2026_CALENDAR } from '@/lib/events/afl-2026-calendar'
import { DashboardCard } from './dashboard-card'
import { DashboardFeaturedPromotions } from './dashboard-featured-promotions'
import { selectUpcomingInvitations } from '../_lib/home-priority'
import { useDashboardMember } from '../_providers/dashboard-member'
import { dashboardCelebrationStorageKey } from '@/lib/dashboard/celebration'
import { AwardeeOnboardingJourney } from './awardee-onboarding-journey'
import { DashboardCelebration } from './dashboard-celebration'
import { AflCalendarAnnouncement } from './afl-calendar-announcement'
import MagazinePopup from '@/app/components/MagazinePopup'
import { AwardLettersHomeCard } from './award-letter-cards'
import { FestivalCard } from './festival-card'
import { HomeOpportunities } from './home-opportunities'
import { canAttendFestival } from '@/lib/festival/config'

const INTERVIEW_FORM_URL = '/dashboard/me/interview'
const shortcutDescriptions: Record<string, string> = {
  Members: 'Meet fellow awardees',
  Profile: 'Keep your BIO current',
  'Past sessions': 'Revisit recordings, workshops, and previous courses',
  Posts: 'Write in your own words',
  'Get featured': 'Share your work with the team',
  'Apply for magazine': 'Share the story behind your leadership',
  'Schedule an interview': 'Request an interview time',
  'Contact Top100': 'Chat with the Top100 team on WhatsApp',
  'Partner with us': 'Explore working together',
  'Delivery cost': 'Check GIG pricing before paying',
}

export function DashboardHome({ futureProgrammes }: { futureProgrammes: ReactNode }) {
  const { member, dashboardVisitReady } = useDashboardMember()
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [programmeEvents, setProgrammeEvents] = useState<LiveCalendarEvent[]>([])
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

  const shortcuts = [
    { label:'Delivery cost', href:'/dashboard/me/delivery', icon:Truck, color:'charcoal' as const },
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
        detail: invitation.rsvp === 'pending' ? 'Your RSVP is waiting' : `RSVP: ${invitation.rsvp}`,
        sortAt: invitation.event?.startAt ? Date.parse(invitation.event.startAt) : Number.POSITIVE_INFINITY,
        cover: invitation.event?.cover ?? null,
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
        sortAt: Date.parse(event.startAt),
        cover: event.cover,
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
      {canAttendFestival(member.status) && <FestivalCard />}
      <AwardLettersHomeCard />
      <AwardeeOnboardingJourney name={member.name} />
      {loadError && <p role="status" className="hub-status rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm leading-5 text-neutral-700">Some events couldn’t load. We’ll retry automatically; you can also open Events directly.</p>}

      {futureProgrammes}

      <DashboardFeaturedPromotions home />

      <HomeOpportunities />

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
