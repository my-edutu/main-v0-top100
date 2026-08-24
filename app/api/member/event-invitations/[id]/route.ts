// app/api/member/event-invitations/[id]/route.ts
// One invitation belonging to the authenticated member.
//   PATCH -> { rsvp: 'attending' | 'declined' | 'maybe' }
//   POST  -> stamp seen_at (dismisses the "New invitation" pill)
//
// Both handlers scope every read and write by profile_id, and answer 404 — not
// 403 — for an invitation that is not the caller's, so the endpoint never
// confirms that another member's invitation exists.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import {
  EVENT_INVITATIONS_SETUP_MESSAGE,
  INVITATION_NOT_FOUND_MESSAGE,
  evaluateRsvp,
  isMissingEventInvitationsTable,
  mapInvitation,
  type InvitationRow,
} from '@/lib/events/invitations'

export const runtime = 'nodejs'

const EVENT_COLUMNS =
  'id, title, summary, start_at, end_at, location, city, country, featured_image_url, registration_url, registration_label'

const SELECT_WITH_EVENT = `id, event_id, profile_id, message, rsvp, rsvp_at, seen_at, created_at, events!inner(${EVENT_COLUMNS})`

const setupResponse = () =>
  NextResponse.json({ message: EVENT_INVITATIONS_SETUP_MESSAGE, setupRequired: true }, { status: 503 })

const notFound = () => NextResponse.json({ message: INVITATION_NOT_FOUND_MESSAGE }, { status: 404 })

/** The invitation, only if it belongs to this member. Null covers both "does
 *  not exist" and "belongs to someone else" — deliberately indistinguishable. */
async function loadOwnInvitation(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  profileId: string,
) {
  const { data, error } = await supabase
    .from('event_invitations')
    .select(SELECT_WITH_EVENT)
    .eq('id', id)
    .eq('profile_id', profileId)
    .maybeSingle()

  return { invitation: (data as unknown as InvitationRow) ?? null, error }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rateLimit = await checkRateLimit({
    ...RATE_LIMITS.QUERY,
    identifier: `event-invitation-rsvp:${user.id}`,
  })
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'Too many RSVP updates. Please try again shortly.')
  }

  const { id } = await params
  if (!id) return notFound()

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { invitation, error } = await loadOwnInvitation(supabase, id, user.id)

  if (error) {
    if (isMissingEventInvitationsTable(error)) return setupResponse()
    console.error('[member/event-invitations/:id] load failed', error)
    return NextResponse.json({ message: 'Could not load this invitation.' }, { status: 500 })
  }

  const eventStartAt = Array.isArray(invitation?.events)
    ? invitation?.events[0]?.start_at
    : invitation?.events?.start_at

  const decision = evaluateRsvp({ invitation, eventStartAt, rsvp: body.rsvp })
  if (!decision.ok) {
    return NextResponse.json({ message: decision.message }, { status: decision.status })
  }

  // Scoped by profile_id as well as id: even though the row was just checked,
  // the write must not be able to reach another member's row.
  const { data, error: updateError } = await supabase
    .from('event_invitations')
    .update({ rsvp: decision.rsvp, rsvp_at: new Date().toISOString(), seen_at: invitation?.seen_at ?? new Date().toISOString() })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select(SELECT_WITH_EVENT)
    .maybeSingle()

  if (updateError) {
    if (isMissingEventInvitationsTable(updateError)) return setupResponse()
    console.error('[member/event-invitations/:id] rsvp failed', updateError)
    return NextResponse.json({ message: 'Could not save your RSVP.' }, { status: 500 })
  }
  if (!data) return notFound()

  return NextResponse.json({ invitation: mapInvitation(data as unknown as InvitationRow) })
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rateLimit = await checkRateLimit({
    ...RATE_LIMITS.QUERY,
    identifier: `event-invitation-seen:${user.id}`,
  })
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'Too many requests. Please try again shortly.')
  }

  const { id } = await params
  if (!id) return notFound()

  const supabase = createAdminClient()

  // is('seen_at', null) makes this idempotent: the first view wins and a later
  // re-render never moves the timestamp.
  const { error } = await supabase
    .from('event_invitations')
    .update({ seen_at: new Date().toISOString() })
    .eq('id', id)
    .eq('profile_id', user.id)
    .is('seen_at', null)

  if (error) {
    if (isMissingEventInvitationsTable(error)) return setupResponse()
    console.error('[member/event-invitations/:id] seen failed', error)
    return NextResponse.json({ message: 'Could not update this invitation.' }, { status: 500 })
  }

  // No row matched means it was already seen, or is not this member's. Either
  // way there is nothing to report and nothing to leak.
  return NextResponse.json({ ok: true })
}
