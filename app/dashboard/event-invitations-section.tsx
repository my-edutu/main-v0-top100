'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Sparkles } from 'lucide-react'
import type { MemberProfile } from '@/lib/member-hub'
import { fetchEventInvitations, fetchPublicEvents, publicEventToProgrammeEvent, type EventInvitation } from '@/lib/events/invitations-client'
import type { MemberProgrammeEvent } from '@/lib/events/programme-api'
import { ProgrammeEventCard } from './discover/events/_components/programme-event-card'
import { ProgrammeHeader } from './discover/events/_components/programme-header'

export default function EventInvitationsSection({ member }: { member: MemberProfile }) {
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [events, setEvents] = useState<MemberProgrammeEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([fetchEventInvitations(), fetchPublicEvents(Number.MAX_SAFE_INTEGER)]).then(([invites, published]) => {
      if (cancelled) return
      setInvitations(invites.status === 'fulfilled' ? invites.value.invitations : [])
      setEvents(published.status === 'fulfilled' ? published.value.map(publicEventToProgrammeEvent) : [])
      if (invites.status === 'rejected' || published.status === 'rejected') setError('Some events could not load. Please try again.')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [member.id, retry])

  const invitationByEvent = useMemo(() => new Map(invitations.map(invitation => [invitation.eventId, invitation])), [invitations])
  const sorted = useMemo(() => [...events].sort((a, b) => {
    const time = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : Infinity
    return time(a.startAt) - time(b.startAt)
  }), [events])
  const nextEvent = sorted.find(event => event.startAt && Date.parse(event.startAt) >= now)

  return <section aria-label="Events" className="space-y-5">
    {loading ? <p role="status" className="py-8 text-sm text-stone-500">Loading events…</p> : <>
      {error && <div role="alert" className="border-b py-4 text-sm"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 underline">Try again</button></div>}
      {!error && !sorted.length && <div className="py-14 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-orange-500" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-medium">No upcoming events</h2>
        <p className="mt-2 text-sm text-stone-500">New events and invitations will appear here.</p>
      </div>}
      {sorted.length ? <>
        <ProgrammeHeader nextTitle={nextEvent?.title ?? null} />
        <div className="space-y-4">
          {sorted.map((event, index) => <div key={event.id} className="space-y-3">
            {invitationByEvent.get(event.id)?.message ? <div className="flex gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
              <p>{invitationByEvent.get(event.id)?.message}</p>
            </div> : null}
            <ProgrammeEventCard event={event} completed={Boolean(event.startAt && Date.parse(event.startAt) < now)} index={index} />
          </div>)}
        </div>
      </> : null}
    </>}
  </section>
}
