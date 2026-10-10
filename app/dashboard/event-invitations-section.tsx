'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, CalendarPlus, Clock3, Video } from 'lucide-react'
import type { MemberProfile } from '@/lib/member-hub'
import { fetchEventInvitations, type EventInvitation } from '@/lib/events/invitations-client'
import { fetchLiveCalendarEvents } from '@/lib/events/live-calendar-client'
import type { LiveCalendarEvent } from '@/lib/events/live-calendar'
import { AFL_2026_CALENDAR } from '@/lib/events/afl-2026-calendar'
import Image from '@/components/safe-image'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(value))
}

export default function EventInvitationsSection({ member }: { member: MemberProfile }) {
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [events, setEvents] = useState<LiveCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([fetchEventInvitations(), fetchLiveCalendarEvents()]).then(([invites, published]) => {
      if (cancelled) return
      setInvitations(invites.status === 'fulfilled' ? invites.value.invitations : [])
      setEvents(published.status === 'fulfilled' ? published.value : [])
      setError(published.status === 'rejected' ? 'The live calendar could not load. Open it directly in Google Calendar.' : '')
      setLoading(false)
    })
    const refresh = window.setInterval(() => {
      void fetchLiveCalendarEvents().then(liveEvents => {
        if (!cancelled) { setEvents(liveEvents); setError('') }
      }).catch(() => {
        if (!cancelled) setError('The live calendar could not refresh. Open it directly in Google Calendar.')
      })
    }, 300_000)
    return () => { cancelled = true; window.clearInterval(refresh) }
  }, [member.id, retry])

  return <section aria-label="Events" className="space-y-5">
    <div className="rounded-[22px] border border-[#F0D8C5] bg-[#FFF8F0] p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#A6440D]">Live programme calendar</p>
      <h2 className="mt-1 text-xl font-semibold text-[#171412]">Africa Future Leaders 2026</h2>
      <p className="mt-1 text-sm leading-6 text-[#625B52]">Your sessions, dates and meeting links in one place. Add the calendar to keep the schedule alongside your own.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={AFL_2026_CALENDAR.addUrl} target="_blank" rel="noopener noreferrer" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FF9D00] px-4 text-sm font-semibold text-[#171412] hover:bg-[#FFB329]"><CalendarPlus className="h-4 w-4" aria-hidden="true" />Add to Google Calendar</a>
        <a href={AFL_2026_CALENDAR.viewUrl} target="_blank" rel="noopener noreferrer" className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700 inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E9C9AE] bg-white px-4 text-sm font-semibold text-[#84330B]"><ArrowUpRight className="h-4 w-4" aria-hidden="true" />View calendar</a>
      </div>
    </div>
    {invitations.filter(invitation => invitation.message).map(invitation => <p key={invitation.id} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">{invitation.message}</p>)}
    {loading ? <p role="status" className="py-8 text-sm text-stone-500">Loading live events…</p> : null}
    {error ? <div role="alert" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 underline">Try again</button></div> : null}
    {!loading && !error && !events.length ? <p className="py-8 text-sm text-stone-500">No events are currently listed on the live calendar.</p> : null}
    {events.length ? <ol className="grid items-start gap-4 sm:grid-cols-2">{events.map(event => <li key={event.id} className="overflow-hidden rounded-[18px] border border-[#E9D6C5] bg-white">
      {event.cover ? <a href={event.cover} target="_blank" rel="noopener noreferrer" aria-label="View full onboarding poster" className="block bg-[#FFC528] focus-visible:outline-2 focus-visible:outline-orange-700">
        <Image src={event.cover} alt="Africa Future Leaders 2026 onboarding poster" width={1755} height={2194} className="mx-auto h-64 w-auto object-contain sm:h-72" />
        <span className="flex min-h-11 items-center justify-center gap-1 text-sm font-medium text-[#171412]">View full poster<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></span>
      </a> : null}
      <div className="p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-[#A6440D]"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" /><time dateTime={event.startAt}>{formatDate(event.startAt)}</time></p>
        <h3 className="mt-3 text-lg font-semibold leading-7 text-[#171412]">{event.title}</h3>
        <p className="mt-3 flex items-center gap-2 text-sm text-[#625B52]"><Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />{formatTime(event.startAt)}–{formatTime(event.endAt)} WAT</p>
        {event.meetUrl ? <a href={event.meetUrl} target="_blank" rel="noopener noreferrer" className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#FFF1DF] px-4 text-sm font-semibold text-[#84330B] hover:bg-[#FFE3BC] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700"><Video className="h-4 w-4" aria-hidden="true" />Open Google Meet<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a> : <p className="mt-5 text-sm text-stone-500">Meeting link coming soon</p>}
      </div>
    </li>)}</ol> : null}
  </section>
}
