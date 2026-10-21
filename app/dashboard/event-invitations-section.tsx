'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, CalendarPlus, Clock3, Video } from 'lucide-react'
import type { MemberProfile } from '@/lib/member-hub'
import { fetchEventInvitations, type EventInvitation } from '@/lib/events/invitations-client'
import { fetchLiveCalendarEvents } from '@/lib/events/live-calendar-client'
import type { LiveCalendarEvent } from '@/lib/events/live-calendar'
import { AFL_2026_CALENDAR } from '@/lib/events/afl-2026-calendar'
import Image from '@/components/safe-image'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }).format(new Date(value))
}

function hasEventStarted(value: string) {
  const startTime = Date.parse(value)
  return Number.isFinite(startTime) && startTime <= Date.now()
}

export default function EventInvitationsSection({ member }: { member: MemberProfile }) {
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [events, setEvents] = useState<LiveCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [posterToView, setPosterToView] = useState<string | null>(null)

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
    <div className="live-calendar-intro">
      <a className="live-calendar-intro-hitarea" href={AFL_2026_CALENDAR.viewUrl} target="_blank" rel="noopener noreferrer" aria-label="View the Africa Future Leaders 2026 calendar" />
      <div className="live-calendar-intro-copy">
        <p className="live-calendar-intro-kicker">Live programme calendar</p>
        <h2>Africa Future Leaders 2026 <ArrowUpRight className="live-calendar-intro-arrow" aria-hidden="true" /></h2>
        <p>Upcoming sessions, dates, and meeting links.</p>
      </div>
      <a href={AFL_2026_CALENDAR.addUrl} target="_blank" rel="noopener noreferrer" className="live-calendar-add-link"><CalendarPlus className="h-4 w-4" aria-hidden="true" /><span>Add calendar</span></a>
    </div>
    {invitations.filter(invitation => invitation.message).map(invitation => <p key={invitation.id} className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">{invitation.message}</p>)}
    {loading ? <p role="status" className="py-8 text-sm text-stone-500">Loading live events…</p> : null}
    {error ? <div role="alert" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 underline">Try again</button></div> : null}
    {!loading && !error && !events.length ? <p className="py-8 text-sm text-stone-500">No events are currently listed on the live calendar.</p> : null}
    {events.length ? <ol className="live-calendar-events">{events.map((event, index) => {
      const past = hasEventStarted(event.startAt)
      return <li key={event.id} className={`live-calendar-event${event.cover ? '' : ' is-without-poster'}`}>
        {event.cover ? <button type="button" onClick={() => setPosterToView(event.cover)} aria-label={`View ${event.title} poster`} className="live-calendar-event-poster focus-visible:outline-2 focus-visible:outline-orange-700">
          <Image src={event.cover} alt={`${event.title} poster`} width={1485} height={1856} sizes="(max-width: 700px) 40vw, 240px" loading={index === 0 ? 'eager' : 'lazy'} className="h-full w-full object-contain" />
        </button> : null}
        <div className="live-calendar-event-copy">
          <p className="live-calendar-event-date"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" /><time dateTime={event.startAt}>{formatDate(event.startAt)}</time></p>
          <h3 className="live-calendar-event-title">{event.title}</h3>
          <p className="live-calendar-event-time"><Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />{formatTime(event.startAt)}–{formatTime(event.endAt)} WAT</p>
          {past ? <p className="live-calendar-event-unavailable">Session ended</p> : event.meetUrl ? <a href={event.meetUrl} target="_blank" rel="noopener noreferrer" className="live-calendar-event-meet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"><Video className="h-4 w-4 shrink-0" aria-hidden="true" />Open Google Meet<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a> : <p className="live-calendar-event-unavailable">Meeting link coming soon</p>}
        </div>
      </li>
    })}</ol> : null}
    <Dialog open={posterToView !== null} onOpenChange={open => { if (!open) setPosterToView(null) }}>
      <DialogContent
        aria-describedby="event-poster-viewer-description"
        className="event-poster-dialog"
        overlayClassName="bg-black/95"
        style={{ inset: 0, left: 0, top: 0, width: '100vw', maxWidth: 'none', height: '100dvh', maxHeight: '100dvh', transform: 'none', border: 0, borderRadius: 0, padding: 0, backgroundColor: '#100e0a' }}
      >
        <DialogTitle className="sr-only">Event poster</DialogTitle>
        <DialogDescription id="event-poster-viewer-description" className="sr-only">Full-screen event poster. Close the viewer to return to Events.</DialogDescription>
        {posterToView ? <Image src={posterToView} alt="Full-screen event poster" width={1485} height={1856} className="mx-auto h-auto max-h-[calc(100dvh-32px)] w-auto max-w-[calc(100vw-32px)] object-contain" /> : null}
      </DialogContent>
    </Dialog>
  </section>
}
