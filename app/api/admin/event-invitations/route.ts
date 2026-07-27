// app/api/admin/event-invitations/route.ts
// Admin: send event invitations, and read the RSVP roster for one event.
//   POST -> { eventId, audience, profileIds?, cohortYear?, message? }
//           audience: 'all' | 'approved' | 'cohort' | 'selected'
//           returns { invited, skipped }
//   GET  ?eventId= -> the roster with per-status counts.
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  EMPTY_AUDIENCE_MESSAGE,
  EVENT_INVITATIONS_SETUP_MESSAGE,
  MEMBER_HUB_SETUP_MESSAGE,
  countByRsvp,
  insertInvitations,
  isMissingEventInvitationsTable,
  isMissingMemberStatusColumn,
  parseAudience,
  resolveAudienceProfileIds,
} from '@/lib/events/invitations'

export const runtime = 'nodejs'

const MESSAGE_MAX = 600

const setupResponse = () =>
  NextResponse.json({ message: EVENT_INVITATIONS_SETUP_MESSAGE, setupRequired: true }, { status: 503 })

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : ''
  if (!eventId) {
    return NextResponse.json({ message: 'Pick an event to invite members to.' }, { status: 400 })
  }

  const parsed = parseAudience(body)
  if (!parsed.ok) return NextResponse.json({ message: parsed.message }, { status: 400 })

  const rawMessage = typeof body.message === 'string' ? body.message.trim() : ''
  if (rawMessage.length > MESSAGE_MAX) {
    return NextResponse.json(
      { message: `Keep the personal note under ${MESSAGE_MAX} characters.` },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  // Confirm the event exists before resolving an audience for it — otherwise
  // the FK would fail after the recipient query had already been paid for, and
  // the admin would get an opaque error instead of "that event is gone".
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .maybeSingle()

  if (eventError) {
    console.error('[admin/event-invitations] event lookup failed', eventError)
    return NextResponse.json({ message: 'Could not load that event.' }, { status: 500 })
  }
  if (!event) return NextResponse.json({ message: 'Event not found.' }, { status: 404 })

  const { profileIds, error: audienceError } = await resolveAudienceProfileIds(supabase, parsed.value)

  if (audienceError) {
    // 'approved' filters on profiles.membership_status, which the live DB may
    // not have yet. That is a setup problem, not a server fault.
    if (isMissingMemberStatusColumn(audienceError)) {
      return NextResponse.json({ message: MEMBER_HUB_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    }
    console.error('[admin/event-invitations] audience resolution failed', audienceError)
    return NextResponse.json({ message: 'Could not resolve the recipient list.' }, { status: 500 })
  }

  // Never report success for an audience that resolved to nobody.
  if (profileIds.length === 0) {
    return NextResponse.json({ message: EMPTY_AUDIENCE_MESSAGE }, { status: 400 })
  }

  const { invited, skipped, error: insertError } = await insertInvitations(
    supabase,
    eventId,
    profileIds,
    { invitedBy: adminCheck.user?.id ?? null, message: rawMessage || null },
  )

  if (insertError) {
    if (isMissingEventInvitationsTable(insertError)) return setupResponse()
    console.error('[admin/event-invitations] insert failed', insertError)
    return NextResponse.json({ message: 'Could not send the invitations.' }, { status: 500 })
  }

  return NextResponse.json({ invited, skipped, recipients: profileIds.length }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const eventId = request.nextUrl.searchParams.get('eventId')?.trim()
  if (!eventId) {
    return NextResponse.json({ message: 'An eventId is required.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('event_invitations')
    // The FK is named explicitly: event_invitations has two FKs to profiles
    // (profile_id and invited_by), so PostgREST needs the hint to know which
    // relationship to embed.
    .select(
      'id, profile_id, rsvp, rsvp_at, seen_at, created_at, profiles:profiles!event_invitations_profile_id_fkey(id, full_name, email)',
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(2000)

  if (error) {
    if (isMissingEventInvitationsTable(error)) return setupResponse()
    console.error('[admin/event-invitations] roster failed', error)
    return NextResponse.json({ message: 'Could not load the RSVP roster.' }, { status: 500 })
  }

  const rows = (data ?? []) as Array<{
    id: string
    profile_id: string
    rsvp?: string | null
    rsvp_at?: string | null
    seen_at?: string | null
    created_at?: string | null
    profiles?: { id?: string; full_name?: string | null; email?: string | null } | Array<{ id?: string; full_name?: string | null; email?: string | null }> | null
  }>

  const roster = rows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    return {
      id: row.id,
      profileId: row.profile_id,
      name: profile?.full_name?.trim() || 'Member',
      email: profile?.email ?? null,
      rsvp: row.rsvp ?? 'pending',
      rsvpAt: row.rsvp_at ?? null,
      seenAt: row.seen_at ?? null,
      invitedAt: row.created_at ?? null,
    }
  })

  return NextResponse.json({ roster, counts: countByRsvp(rows), total: roster.length })
}
