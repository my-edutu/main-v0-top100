// lib/events/invitations-client.ts
// Browser-side fetch wrappers for the event-invitation routes. Safe to import
// from client components — it must never pull in lib/events/invitations.ts,
// which is server-side.

import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'

export type Rsvp = 'pending' | 'attending' | 'declined' | 'maybe'
export type RsvpChoice = 'attending' | 'declined' | 'maybe'

export const RSVP_CHOICES: RsvpChoice[] = ['attending', 'declined', 'maybe']

export const RSVP_LABELS: Record<RsvpChoice, string> = {
  attending: 'Attending',
  declined: 'Not attending',
  maybe: 'Maybe',
}

export type InvitationEvent = {
  id: string
  title: string
  summary: string | null
  startAt: string | null
  location: string | null
  cover: string | null
  registrationUrl: string | null
  registrationLabel: string
}

export type EventInvitation = {
  id: string
  eventId: string
  rsvp: Rsvp
  rsvpAt: string | null
  seenAt: string | null
  message: string | null
  createdAt: string | null
  event: InvitationEvent | null
}

export type EventInvitationsResponse = {
  invitations: EventInvitation[]
  pendingCount: number
}

/** The public events listing, as /api/events returns it. */
export type PublicEvent = {
  id: string
  title: string
  summary?: string
  start_at?: string
  registration_url?: string
  registration_label?: string
  cover?: string
  featured_image_url?: string
}

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null)
  if (payload && typeof payload === 'object' && typeof (payload as any).message === 'string') {
    return (payload as any).message
  }
  return fallback
}

export async function fetchEventInvitations(): Promise<EventInvitationsResponse> {
  const response = await fetchWithTimeout('/api/member/event-invitations', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(await readError(response, 'Could not load your invitations.'))
  }
  const payload = (await response.json()) as Partial<EventInvitationsResponse>
  return {
    invitations: Array.isArray(payload.invitations) ? payload.invitations : [],
    pendingCount: typeof payload.pendingCount === 'number' ? payload.pendingCount : 0,
  }
}

export async function setInvitationRsvp(id: string, rsvp: RsvpChoice): Promise<EventInvitation> {
  const response = await fetch(`/api/member/event-invitations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rsvp }),
  })
  if (!response.ok) {
    throw new Error(await readError(response, 'Could not save your RSVP.'))
  }
  const payload = (await response.json()) as { invitation: EventInvitation }
  return payload.invitation
}

/**
 * Stamp seen_at. Best-effort by design: this only drives the "New invitation"
 * pill, so a failure must never surface an error to the member.
 */
export async function markInvitationSeen(id: string): Promise<void> {
  try {
    await fetch(`/api/member/event-invitations/${id}`, { method: 'POST' })
  } catch {
    // Ignored deliberately — see the doc comment.
  }
}

/** The public events listing the dashboard already showed. */
export async function fetchPublicEvents(limit = 6): Promise<PublicEvent[]> {
  const response = await fetch('/api/events', { cache: 'no-store' })
  if (!response.ok) throw new Error('Events request failed')
  const payload = await response.json()
  return Array.isArray(payload) ? (payload.slice(0, limit) as PublicEvent[]) : []
}
