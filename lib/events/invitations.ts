// lib/events/invitations.ts
// Server-side helpers for event invitations + RSVP.
//
// Everything here is either pure or takes its Supabase client as an argument,
// so the logic is unit-testable without a live DB. Only `import type` is used
// for the client, mirroring lib/awards/server.ts — never import this into a
// client component (use lib/events/invitations-client.ts there).
import type { createAdminClient } from '@/lib/supabase/server'

type AdminClient = ReturnType<typeof createAdminClient>

export const EVENT_INVITATIONS_SETUP_MESSAGE =
  'The event invitations table is not set up yet. Ask the admin to run supabase/migrations/20260728_event_invitations.sql.'

// profiles.membership_status is added by the member-hub setup script and is not
// yet present on the live database, so the audiences that depend on it must
// degrade the same way a missing table does rather than 500.
export const MEMBER_HUB_SETUP_MESSAGE =
  'Member statuses are not set up yet. Ask the admin to run supabase/SETUP-MEMBER-HUB.sql, or invite everyone instead.'

export const INVITATION_NOT_FOUND_MESSAGE = 'Invitation not found.'
export const EVENT_PAST_MESSAGE = 'This event has already taken place.'
export const EMPTY_AUDIENCE_MESSAGE =
  'No members matched that audience, so nothing was sent. Pick a different audience and try again.'

/** Batch size for the admin bulk insert. */
export const INVITATION_INSERT_BATCH_SIZE = 500

/** True when the failure is "the migration has not been run yet". */
export function isMissingEventInvitationsTable(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*event_invitations.* does not exist|schema cache/i.test(error.message ?? '')
}

/**
 * True when the failure is "profiles does not have the member-hub columns yet"
 * — Postgres 42703 (undefined column), or PostgREST failing to find the column
 * in its schema cache. Distinct from a missing table: the fix is a different
 * SQL file, so the admin gets a different message.
 */
export function isMissingMemberStatusColumn(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  if (error.code === '42703') return true
  return /membership_status/i.test(error.message ?? '')
}

// ---------------------------------------------------------------------------
// RSVP
// ---------------------------------------------------------------------------

export const RSVP_VALUES = ['pending', 'attending', 'declined', 'maybe'] as const
export type Rsvp = (typeof RSVP_VALUES)[number]

/** The three answers a member is allowed to *set*. 'pending' is server-only. */
export const RSVP_CHOICES = ['attending', 'declined', 'maybe'] as const
export type RsvpChoice = (typeof RSVP_CHOICES)[number]

export function isRsvpChoice(value: unknown): value is RsvpChoice {
  return typeof value === 'string' && (RSVP_CHOICES as readonly string[]).includes(value)
}

export type InvitationRow = {
  id: string
  event_id: string
  profile_id: string
  invited_by?: string | null
  message?: string | null
  rsvp?: string | null
  rsvp_at?: string | null
  seen_at?: string | null
  created_at?: string | null
  events?: EventRow | EventRow[] | null
}

export type EventRow = {
  id: string
  title?: string | null
  summary?: string | null
  start_at?: string | null
  end_at?: string | null
  location?: string | null
  city?: string | null
  country?: string | null
  featured_image_url?: string | null
  registration_url?: string | null
  registration_label?: string | null
}

export type RsvpRejection = { ok: false; status: number; message: string }

/**
 * The whole decision for "may this member set this RSVP right now?".
 *
 * `invitation` is null when the row does not exist *or* is not the caller's —
 * the route must not distinguish the two, hence 404 rather than 403: a 403
 * would confirm that another member's invitation exists.
 */
export function evaluateRsvp(input: {
  invitation: Pick<InvitationRow, 'id'> | null
  eventStartAt?: string | null
  rsvp: unknown
  now?: number
}): { ok: true; rsvp: RsvpChoice } | RsvpRejection {
  if (!isRsvpChoice(input.rsvp)) {
    return {
      ok: false,
      status: 400,
      message: `RSVP must be one of: ${RSVP_CHOICES.join(', ')}.`,
    }
  }

  if (!input.invitation) {
    return { ok: false, status: 404, message: INVITATION_NOT_FOUND_MESSAGE }
  }

  if (hasEventPassed(input.eventStartAt, input.now)) {
    return { ok: false, status: 409, message: EVENT_PAST_MESSAGE }
  }

  return { ok: true, rsvp: input.rsvp }
}

/** An unparseable or absent start date is never treated as past. */
export function hasEventPassed(startAt?: string | null, now = Date.now()): boolean {
  if (!startAt) return false
  const time = new Date(startAt).getTime()
  if (Number.isNaN(time)) return false
  return time < now
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

export type InvitationView = {
  id: string
  eventId: string
  rsvp: Rsvp
  rsvpAt: string | null
  seenAt: string | null
  message: string | null
  createdAt: string | null
  event: {
    id: string
    title: string
    summary: string | null
    startAt: string | null
    location: string | null
    cover: string | null
    registrationUrl: string | null
    registrationLabel: string
  } | null
}

const firstEvent = (value: InvitationRow['events']): EventRow | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** Prefer the explicit venue, otherwise fall back to city/country. */
function eventLocation(event: EventRow): string | null {
  if (event.location && event.location.trim()) return event.location.trim()
  const parts = [event.city, event.country].map((part) => part?.trim()).filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export function mapInvitation(row: InvitationRow): InvitationView {
  const event = firstEvent(row.events)
  const rsvp = (RSVP_VALUES as readonly string[]).includes(row.rsvp ?? '')
    ? (row.rsvp as Rsvp)
    : 'pending'

  return {
    id: row.id,
    eventId: row.event_id,
    rsvp,
    rsvpAt: row.rsvp_at ?? null,
    seenAt: row.seen_at ?? null,
    message: row.message ?? null,
    createdAt: row.created_at ?? null,
    event: event
      ? {
          id: event.id,
          title: event.title?.trim() || 'Untitled event',
          summary: event.summary ?? null,
          startAt: event.start_at ?? null,
          location: eventLocation(event),
          cover: event.featured_image_url ?? null,
          registrationUrl: event.registration_url ?? null,
          registrationLabel: event.registration_label?.trim() || 'Event details',
        }
      : null,
  }
}

/**
 * Upcoming events first (soonest first), past events last (most recent first).
 * Invitations with no usable date sort after upcoming but before past — they
 * are still actionable, just undated.
 */
export function sortInvitations(views: InvitationView[], now = Date.now()): InvitationView[] {
  const time = (view: InvitationView) => {
    const raw = view.event?.startAt
    if (!raw) return null
    const parsed = new Date(raw).getTime()
    return Number.isNaN(parsed) ? null : parsed
  }

  // 0 = upcoming, 1 = undated, 2 = past.
  const bucket = (value: number | null) => (value === null ? 1 : value >= now ? 0 : 2)

  return [...views].sort((a, b) => {
    const aTime = time(a)
    const bTime = time(b)
    const aBucket = bucket(aTime)
    const bBucket = bucket(bTime)
    if (aBucket !== bBucket) return aBucket - bBucket
    if (aTime === null || bTime === null) return 0
    // Upcoming: soonest first. Past: most recent first.
    return aBucket === 0 ? aTime - bTime : bTime - aTime
  })
}

/** Invitations the member has not answered yet — drives the nav badge. */
export function countPending(views: Array<{ rsvp: Rsvp }>): number {
  return views.filter((view) => view.rsvp === 'pending').length
}

/** Per-status tallies for the admin roster. */
export function countByRsvp(rows: Array<{ rsvp?: string | null }>): Record<Rsvp, number> {
  const counts: Record<Rsvp, number> = { pending: 0, attending: 0, declined: 0, maybe: 0 }
  for (const row of rows) {
    const key = (row.rsvp ?? 'pending') as Rsvp
    if (key in counts) counts[key] += 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// Audience resolution
// ---------------------------------------------------------------------------

export const AUDIENCES = ['all', 'approved', 'cohort', 'selected'] as const
export type Audience = (typeof AUDIENCES)[number]

export type AudienceInput =
  | { audience: 'all' }
  | { audience: 'approved' }
  | { audience: 'cohort'; cohortYear: string }
  | { audience: 'selected'; profileIds: string[] }

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Validate the admin's audience payload before it ever reaches the DB. */
export function parseAudience(raw: Record<string, unknown>): ParseResult<AudienceInput> {
  const audience = String(raw.audience ?? '')
  if (!(AUDIENCES as readonly string[]).includes(audience)) {
    return { ok: false, message: `Audience must be one of: ${AUDIENCES.join(', ')}.` }
  }

  if (audience === 'cohort') {
    const cohortYear = String(raw.cohortYear ?? '').trim()
    if (!cohortYear) {
      return { ok: false, message: 'A cohort year is required for the cohort audience.' }
    }
    return { ok: true, value: { audience: 'cohort', cohortYear } }
  }

  if (audience === 'selected') {
    const list = Array.isArray(raw.profileIds) ? raw.profileIds : []
    const profileIds = Array.from(
      new Set(
        list
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim())
          .filter((id) => UUID_RE.test(id)),
      ),
    )
    if (profileIds.length === 0) {
      return { ok: false, message: 'Select at least one member to invite.' }
    }
    return { ok: true, value: { audience: 'selected', profileIds } }
  }

  return { ok: true, value: { audience: audience as 'all' | 'approved' } }
}

/**
 * Minimal shape of the chainable PostgREST builder the filter needs. Declared
 * structurally so the resolution can be tested against a recording fake.
 */
export type AudienceQuery = {
  eq: (column: string, value: unknown) => AudienceQuery
  in: (column: string, values: readonly unknown[]) => AudienceQuery
}

/**
 * Narrow a `profiles` select down to the requested audience.
 * - 'all'      -> every member account (role = 'user', so admins are excluded).
 * - 'approved' -> the above, plus membership_status = 'approved'. NOTE: the
 *   SQL column is `membership_status`, not `status` — see
 *   app/api/admin/notifications/broadcast/route.ts, which resolves the same
 *   audience for broadcasts.
 * - 'cohort'   -> the above, plus profiles.cohort (a text column) matching the year.
 * - 'selected' -> exactly the ids the admin picked, with no role filter: they
 *   named these members explicitly, so second-guessing the list would silently
 *   drop recipients.
 */
export function applyAudienceFilter<Q extends AudienceQuery>(query: Q, input: AudienceInput): Q {
  if (input.audience === 'selected') {
    return query.in('id', input.profileIds) as Q
  }

  const members = query.eq('role', 'user') as Q

  switch (input.audience) {
    case 'approved':
      return members.eq('membership_status', 'approved') as Q
    case 'cohort':
      return members.eq('cohort', input.cohortYear) as Q
    case 'all':
    default:
      return members
  }
}

/** Resolve the audience to concrete profile ids. */
export async function resolveAudienceProfileIds(
  supabase: AdminClient,
  input: AudienceInput,
): Promise<{ profileIds: string[]; error: { code?: string; message?: string } | null }> {
  const base = supabase.from('profiles').select('id')
  const { data, error } = await (applyAudienceFilter(base as unknown as AudienceQuery, input) as any)

  if (error) return { profileIds: [], error }

  const profileIds = Array.from(
    new Set(
      ((data ?? []) as Array<{ id?: unknown }>)
        .map((row) => (typeof row.id === 'string' ? row.id : null))
        .filter((id): id is string => Boolean(id)),
    ),
  )

  return { profileIds, error: null }
}

// ---------------------------------------------------------------------------
// Bulk insert
// ---------------------------------------------------------------------------

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) return [items.slice()]
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }
  return batches
}

export type NewInvitationRow = {
  event_id: string
  profile_id: string
  invited_by: string | null
  message: string | null
}

export function buildInvitationRows(
  eventId: string,
  profileIds: readonly string[],
  options: { invitedBy?: string | null; message?: string | null } = {},
): NewInvitationRow[] {
  const message = options.message?.trim() || null
  return profileIds.map((profileId) => ({
    event_id: eventId,
    profile_id: profileId,
    invited_by: options.invitedBy ?? null,
    message,
  }))
}

/**
 * Insert the invitations in batches, ignoring members who already have one.
 *
 * `ignoreDuplicates: true` compiles to ON CONFLICT DO NOTHING, so re-sending an
 * invitation can never overwrite an RSVP a member already gave. `select()`
 * returns only the rows that were actually written, which is what makes the
 * invited/skipped split accurate rather than assumed.
 */
export async function insertInvitations(
  supabase: AdminClient,
  eventId: string,
  profileIds: readonly string[],
  options: { invitedBy?: string | null; message?: string | null } = {},
): Promise<{ invited: number; skipped: number; error: { code?: string; message?: string } | null }> {
  const rows = buildInvitationRows(eventId, profileIds, options)
  let invited = 0

  for (const batch of chunk(rows, INVITATION_INSERT_BATCH_SIZE)) {
    const { data, error } = await supabase
      .from('event_invitations')
      .upsert(batch, { onConflict: 'event_id,profile_id', ignoreDuplicates: true })
      .select('id')

    if (error) return { invited, skipped: 0, error }
    invited += (data ?? []).length
  }

  return { invited, skipped: rows.length - invited, error: null }
}
