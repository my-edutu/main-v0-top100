'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import type { MemberProfile } from '@/lib/member-hub'
import { fetchEventInvitations, fetchPublicEvents, setInvitationRsvp, RSVP_CHOICES, RSVP_LABELS, type EventInvitation, type PublicEvent, type RsvpChoice } from '@/lib/events/invitations-client'

export default function EventInvitationsSection({ member }: { member: MemberProfile }) {
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [saving, setSaving] = useState<string | null>(null)

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

  async function respond(invitation: EventInvitation, choice: RsvpChoice) {
    if (saving || invitation.rsvp === choice) return
    setSaving(invitation.id)
    try {
      const saved = await setInvitationRsvp(invitation.id, choice)
      setInvitations(current => current.map(item => item.id === saved.id ? saved : item))
    } catch {
      toast.error('Could not save your response. Please try again.')
    } finally { setSaving(null) }
  }

  const rows = new Map(events.map(event => [event.id, {
    id: event.id, title: event.title, summary: event.summary, startAt: event.start_at,
    url: event.registration_url, label: event.registration_label, invitation: null as EventInvitation | null,
  }]))
  for (const invitation of invitations) {
    if (!invitation.event) continue
    const event = invitation.event
    rows.set(invitation.eventId, { id: invitation.eventId, title: event.title, summary: event.summary ?? undefined, startAt: event.startAt ?? undefined, url: event.registrationUrl ?? undefined, label: event.registrationLabel, invitation })
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
      <div className="divide-y divide-stone-200">{sorted.map(event => {
        const past = Boolean(event.startAt && Date.parse(event.startAt) < Date.now())
        return <article key={event.id} className="space-y-3 py-5">
          <p className="text-xs text-stone-500">{event.startAt && Number.isFinite(Date.parse(event.startAt)) ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(event.startAt)) : 'Date to be announced'}{past ? ' · Past event' : ''}</p>
          <h2 className="text-lg font-medium">{event.title}</h2>
          {event.summary && <p className="text-sm leading-6 text-stone-600">{event.summary}</p>}
          {event.invitation?.message && <p className="text-sm leading-6 text-stone-600">{event.invitation.message}</p>}
          {event.invitation && <div className="flex flex-wrap gap-2" role="group" aria-label={`Respond to ${event.title}`}>
            {RSVP_CHOICES.map(choice => <button key={choice} disabled={past || saving !== null} aria-pressed={event.invitation?.rsvp === choice} onClick={() => void respond(event.invitation!, choice)} className="min-h-11 rounded-lg border border-stone-200 px-4 text-sm aria-pressed:border-orange-500 aria-pressed:bg-orange-100 disabled:opacity-60">{RSVP_LABELS[choice]}</button>)}
          </div>}
          {event.url && <Link className="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-4" href={event.url}>{event.label || 'View invitation'}<ArrowUpRight size={16} /></Link>}
        </article>
      })}</div>
    </>}
  </section>
}
