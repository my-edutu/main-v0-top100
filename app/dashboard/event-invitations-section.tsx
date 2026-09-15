'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, MapPin, Sparkles } from 'lucide-react'
import type { MemberProfile } from '@/lib/member-hub'
import { fetchEventInvitations, fetchPublicEvents, type EventInvitation, type PublicEvent } from '@/lib/events/invitations-client'
import { eventCoverUrl } from '@/lib/events/presentation'

export default function EventInvitationsSection({ member }: { member: MemberProfile }) {
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.allSettled([fetchEventInvitations(), fetchPublicEvents(Number.MAX_SAFE_INTEGER)]).then(([invites, published]) => {
      if (cancelled) return
      setInvitations(invites.status === 'fulfilled' ? invites.value.invitations : [])
      setEvents(published.status === 'fulfilled' ? published.value : [])
      if (invites.status === 'rejected' || published.status === 'rejected') setError('Some events could not load. Please try again.')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [member.id, retry])

  const rows = new Map(events.map(event => [event.id, {
    id: event.id, title: event.title, summary: event.summary, startAt: event.start_at,
    url: event.registration_url, label: event.registration_label, cover: event.cover || event.featured_image_url,
    location: undefined as string | undefined, invitation: null as EventInvitation | null,
  }]))
  for (const invitation of invitations) {
    if (!invitation.event) continue
    const event = invitation.event
    rows.set(invitation.eventId, { id: invitation.eventId, title: event.title, summary: event.summary ?? undefined, startAt: event.startAt ?? undefined, url: event.registrationUrl ?? undefined, label: event.registrationLabel, cover: event.cover ?? undefined, location: event.location ?? undefined, invitation })
  }
  const sorted = [...rows.values()].sort((a, b) => {
    const time = (value?: string) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity
    const now = Date.now()
    const aPast = time(a.startAt) < now
    const bPast = time(b.startAt) < now
    return Number(aPast) - Number(bPast) || (aPast ? time(b.startAt) - time(a.startAt) : time(a.startAt) - time(b.startAt))
  })

  return <section aria-label="Events" className="space-y-4">
    {loading ? <p role="status" className="py-8 text-sm text-stone-500">Loading events…</p> : <>
      {error && <div role="alert" className="border-b py-4 text-sm"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 underline">Try again</button></div>}
      {!error && !sorted.length && <div className="py-14 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-orange-500" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-medium">No upcoming events</h2>
        <p className="mt-2 text-sm text-stone-500">New events and invitations will appear here.</p>
      </div>}
      <div className="grid gap-5 md:grid-cols-2">{sorted.map((event, index) => {
        const past = Boolean(event.startAt && Date.parse(event.startAt) < Date.now())
        return <EventCard key={event.id} event={event} index={index} past={past} />
      })}</div>
    </>}
  </section>
}

type EventCardData = {
  id: string
  title: string
  summary?: string
  startAt?: string
  url?: string
  label?: string
  cover?: string | null
  location?: string
  invitation: EventInvitation | null
}

function EventCard({
  event,
  index,
  past,
}: {
  event: EventCardData
  index: number
  past: boolean
}) {
  const date = event.startAt && Number.isFinite(Date.parse(event.startAt))
    ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(event.startAt))
    : 'Date to be announced'

  const content = (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center opacity-25 grayscale-[0.2] transition duration-700 group-hover:scale-105 group-hover:opacity-35"
        style={{ backgroundImage: `url("${eventCoverUrl({ cover: event.cover }, index)}")` }}
        role="img"
        aria-label={`${event.title} event cover`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,30,29,0.88)_0%,rgba(30,30,29,0.78)_42%,rgba(14,14,14,0.96)_100%)]" />
      <div className="relative flex min-h-[360px] flex-col justify-between p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
            {event.invitation ? 'Invitation' : 'AFL event'}
          </span>
          {past ? <span className="rounded-full bg-black/45 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur-md">Past event</span> : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">{date}</p>
          <h2 className="mt-2 max-w-[18ch] text-2xl font-semibold leading-[1.05] tracking-[-0.03em] sm:text-3xl">{event.title}</h2>
          {event.summary ? <p className="mt-3 line-clamp-2 max-w-lg text-sm leading-6 text-white/75">{event.summary}</p> : null}
          {event.location ? <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-white/65"><MapPin className="h-3.5 w-3.5 text-orange-300" />{event.location}</p> : null}

          {event.invitation?.message ? (
            <div className="mt-4 flex gap-2 rounded-2xl border border-white/15 bg-black/25 px-3.5 py-3 backdrop-blur-md">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
              <p className="line-clamp-2 text-xs leading-5 text-white/80">{event.invitation.message}</p>
            </div>
          ) : null}

          {event.url && !past ? <span className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition group-hover:bg-orange-100">
            Register
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </span> : null}
        </div>
      </div>
    </>
  )

  const className = 'group relative block min-h-[360px] overflow-hidden rounded-[24px] border border-white/10 bg-[#111] text-white shadow-[0_18px_50px_-24px_rgba(0,0,0,0.75)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-22px_rgba(0,0,0,0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-white'
  return event.url ? <a className={className} href={event.url}>{content}</a> : <article className={className}>{content}</article>
}
