// app/api/member/event-invitations/route.ts
// The authenticated member's event invitations.
//   GET -> their invitations joined to the event, upcoming first, past last,
//          plus { pendingCount } for the nav badge.
import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import {
  EVENT_INVITATIONS_SETUP_MESSAGE,
  countPending,
  isMissingEventInvitationsTable,
  mapInvitation,
  sortInvitations,
  type InvitationRow,
} from '@/lib/events/invitations'

export const runtime = 'nodejs'

// The embedded event columns the dashboard card needs. Named explicitly rather
// than `events(*)` so the payload does not carry admin-only fields.
const EVENT_COLUMNS =
  'id, title, summary, start_at, end_at, location, city, country, featured_image_url, registration_url, registration_label'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rateLimit = await checkRateLimit({
    ...RATE_LIMITS.QUERY,
    identifier: `event-invitations:${user.id}`,
  })
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'Too many requests. Please try again shortly.')
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('event_invitations')
    .select(`id, event_id, profile_id, message, rsvp, rsvp_at, seen_at, created_at, events!inner(${EVENT_COLUMNS})`)
    .eq('profile_id', user.id)
    .limit(200)

  if (error) {
    if (isMissingEventInvitationsTable(error)) {
      return NextResponse.json(
        { message: EVENT_INVITATIONS_SETUP_MESSAGE, setupRequired: true },
        { status: 503 },
      )
    }
    console.error('[member/event-invitations] load failed', error)
    return NextResponse.json({ message: 'Could not load your invitations.' }, { status: 500 })
  }

  const invitations = sortInvitations(((data ?? []) as unknown as InvitationRow[]).map(mapInvitation))

  return NextResponse.json({ invitations, pendingCount: countPending(invitations) })
}
