import { describe, expect, it } from 'vitest'

import {
  EMPTY_AUDIENCE_MESSAGE,
  EVENT_PAST_MESSAGE,
  INVITATION_NOT_FOUND_MESSAGE,
  applyAudienceFilter,
  buildInvitationRows,
  chunk,
  countByRsvp,
  countPending,
  evaluateRsvp,
  insertInvitations,
  isMissingEventInvitationsTable,
  isMissingMemberStatusColumn,
  mapInvitation,
  parseAudience,
  sortInvitations,
  type AudienceInput,
  type AudienceQuery,
  type InvitationRow,
} from '@/lib/events/invitations'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

const NOW = Date.parse('2026-07-27T12:00:00.000Z')
const iso = (offsetDays: number) => new Date(NOW + offsetDays * 86_400_000).toISOString()

// A recording stand-in for the PostgREST query builder. Every filter call is
// captured so the audience resolution can be asserted without a live DB.
function fakeQuery() {
  const calls: Array<[string, string, unknown]> = []
  const query: AudienceQuery & { calls: typeof calls } = {
    calls,
    eq(column, value) {
      calls.push(['eq', column, value])
      return query
    },
    in(column, values) {
      calls.push(['in', column, values])
      return query
    },
  }
  return query
}

const resolve = (input: AudienceInput) => {
  const query = fakeQuery()
  applyAudienceFilter(query, input)
  return query.calls
}

describe('audience resolution', () => {
  it("'all' targets every member account and applies no status filter", () => {
    expect(resolve({ audience: 'all' })).toEqual([['eq', 'role', 'user']])
  })

  it("'approved' filters on membership_status, not the non-existent status column", () => {
    const calls = resolve({ audience: 'approved' })
    expect(calls).toEqual([
      ['eq', 'role', 'user'],
      ['eq', 'membership_status', 'approved'],
    ])
    expect(calls.some(([, column]) => column === 'status')).toBe(false)
  })

  it("'cohort' filters on the cohort column for the given year", () => {
    expect(resolve({ audience: 'cohort', cohortYear: '2025' })).toEqual([
      ['eq', 'role', 'user'],
      ['eq', 'cohort', '2025'],
    ])
  })

  it("'selected' targets exactly the named ids, with no role filter", () => {
    expect(resolve({ audience: 'selected', profileIds: [UUID_A, UUID_B] })).toEqual([
      ['in', 'id', [UUID_A, UUID_B]],
    ])
  })
})

describe('parseAudience', () => {
  it('rejects an unknown audience', () => {
    const result = parseAudience({ audience: 'everybody' })
    expect(result.ok).toBe(false)
  })

  it('requires a cohort year for the cohort audience', () => {
    expect(parseAudience({ audience: 'cohort' }).ok).toBe(false)
    expect(parseAudience({ audience: 'cohort', cohortYear: 2025 })).toEqual({
      ok: true,
      value: { audience: 'cohort', cohortYear: '2025' },
    })
  })

  it('requires at least one valid id for the selected audience', () => {
    expect(parseAudience({ audience: 'selected', profileIds: [] }).ok).toBe(false)
    // Non-uuid junk is dropped, and dropping everything is an error rather
    // than an accidental empty send.
    expect(parseAudience({ audience: 'selected', profileIds: ['not-a-uuid'] }).ok).toBe(false)
  })

  it('de-duplicates selected ids', () => {
    const result = parseAudience({ audience: 'selected', profileIds: [UUID_A, UUID_A, UUID_B] })
    expect(result).toEqual({ ok: true, value: { audience: 'selected', profileIds: [UUID_A, UUID_B] } })
  })

  it('has a message for an audience that resolves to nobody', () => {
    expect(EMPTY_AUDIENCE_MESSAGE).toMatch(/nothing was sent/i)
  })
})

describe('insertInvitations — ON CONFLICT DO NOTHING semantics', () => {
  // Simulates a table that already holds an invitation for UUID_A with an RSVP
  // the member gave earlier. ignoreDuplicates means that row is untouched.
  function fakeSupabase(existing: Record<string, string>) {
    const store: Record<string, string> = { ...existing }
    const batches: unknown[][] = []

    const client = {
      from() {
        return {
          upsert(rows: Array<{ profile_id: string }>, options: Record<string, unknown>) {
            batches.push(rows)
            expect(options).toMatchObject({
              onConflict: 'event_id,profile_id',
              ignoreDuplicates: true,
            })
            const written = rows.filter((row) => !(row.profile_id in store))
            for (const row of written) store[row.profile_id] = 'pending'
            return {
              select: async () => ({ data: written.map((_, i) => ({ id: `new-${i}` })), error: null }),
            }
          },
        }
      },
      store,
      batches,
    }

    return client
  }

  it('never resets an RSVP a member already gave, and reports it as skipped', async () => {
    const supabase = fakeSupabase({ [UUID_A]: 'attending' })

    const result = await insertInvitations(supabase as any, 'event-1', [UUID_A, UUID_B])

    expect(result).toEqual({ invited: 1, skipped: 1, error: null })
    // The pre-existing RSVP survived the re-send.
    expect(supabase.store[UUID_A]).toBe('attending')
    expect(supabase.store[UUID_B]).toBe('pending')
  })

  it('chunks the insert in batches of 500', async () => {
    const supabase = fakeSupabase({})
    const ids = Array.from({ length: 1201 }, (_, i) => `p-${i}`)

    const result = await insertInvitations(supabase as any, 'event-1', ids)

    expect(supabase.batches.map((batch) => batch.length)).toEqual([500, 500, 201])
    expect(result.invited).toBe(1201)
    expect(result.skipped).toBe(0)
  })

  it('stops and surfaces the error when a batch fails', async () => {
    const failing = {
      from: () => ({
        upsert: () => ({ select: async () => ({ data: null, error: { code: '42P01' } }) }),
      }),
    }

    const result = await insertInvitations(failing as any, 'event-1', [UUID_A])
    expect(result.error).toEqual({ code: '42P01' })
    expect(result.invited).toBe(0)
  })
})

describe('buildInvitationRows', () => {
  it('carries the admin and the note onto every row, blanking an empty note', () => {
    expect(buildInvitationRows('event-1', [UUID_A], { invitedBy: UUID_B, message: '  ' })).toEqual([
      { event_id: 'event-1', profile_id: UUID_A, invited_by: UUID_B, message: null },
    ])
  })
})

describe('chunk', () => {
  it('returns whole batches and a remainder', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
    expect(chunk([], 2)).toEqual([])
  })
})

describe('evaluateRsvp', () => {
  const invitation = { id: 'inv-1' }

  it('accepts each of the three member choices', () => {
    for (const rsvp of ['attending', 'declined', 'maybe']) {
      expect(evaluateRsvp({ invitation, eventStartAt: iso(5), rsvp, now: NOW })).toEqual({
        ok: true,
        rsvp,
      })
    }
  })

  it("rejects 'pending' and anything else as a member-set value", () => {
    for (const rsvp of ['pending', 'yes', '', null, 42]) {
      const result = evaluateRsvp({ invitation, eventStartAt: iso(5), rsvp, now: NOW })
      expect(result).toMatchObject({ ok: false, status: 400 })
    }
  })

  it('rejects an RSVP on an event that has already started, with 409', () => {
    expect(evaluateRsvp({ invitation, eventStartAt: iso(-1), rsvp: 'attending', now: NOW })).toEqual({
      ok: false,
      status: 409,
      message: EVENT_PAST_MESSAGE,
    })
  })

  it("answers 404 — not 403 — for an invitation that is not the caller's", () => {
    const result = evaluateRsvp({ invitation: null, eventStartAt: iso(5), rsvp: 'attending', now: NOW })
    expect(result).toEqual({ ok: false, status: 404, message: INVITATION_NOT_FOUND_MESSAGE })
    // A 403 would confirm that someone else's invitation exists.
    expect((result as { status: number }).status).not.toBe(403)
  })

  it('validates the rsvp value before revealing anything about the invitation', () => {
    expect(evaluateRsvp({ invitation: null, rsvp: 'garbage', now: NOW })).toMatchObject({ status: 400 })
  })

  it('allows changing an existing RSVP', () => {
    expect(evaluateRsvp({ invitation, eventStartAt: iso(3), rsvp: 'declined', now: NOW })).toEqual({
      ok: true,
      rsvp: 'declined',
    })
  })

  it('treats an undated event as still open', () => {
    expect(evaluateRsvp({ invitation, eventStartAt: null, rsvp: 'maybe', now: NOW })).toMatchObject({
      ok: true,
    })
  })
})

describe('mapInvitation', () => {
  const row: InvitationRow = {
    id: 'inv-1',
    event_id: 'event-1',
    profile_id: UUID_A,
    message: 'Hope to see you there.',
    rsvp: 'maybe',
    rsvp_at: iso(-2),
    seen_at: null,
    created_at: iso(-5),
    events: {
      id: 'event-1',
      title: '  Summit 2026 ',
      summary: 'Three days in Kigali.',
      start_at: iso(10),
      location: null,
      city: 'Kigali',
      country: 'Rwanda',
      featured_image_url: '/cover.jpg',
      registration_url: '/events/summit',
      registration_label: null,
    },
  }

  it('maps the row and its embedded event onto the client shape', () => {
    const view = mapInvitation(row)
    expect(view.event?.title).toBe('Summit 2026')
    // No explicit venue, so city/country stand in.
    expect(view.event?.location).toBe('Kigali, Rwanda')
    expect(view.event?.registrationLabel).toBe('Event details')
    expect(view.rsvp).toBe('maybe')
  })

  it('accepts the embedded event arriving as a single-element array', () => {
    const view = mapInvitation({ ...row, events: [row.events as any] })
    expect(view.event?.id).toBe('event-1')
  })

  it('falls back to pending for an unrecognised rsvp value', () => {
    expect(mapInvitation({ ...row, rsvp: 'sideways' }).rsvp).toBe('pending')
    expect(mapInvitation({ ...row, rsvp: null }).rsvp).toBe('pending')
  })
})

describe('sortInvitations — upcoming first, past last', () => {
  const make = (id: string, startAt: string | null) =>
    mapInvitation({
      id,
      event_id: `e-${id}`,
      profile_id: UUID_A,
      rsvp: 'pending',
      events: { id: `e-${id}`, title: id, start_at: startAt },
    })

  it('puts soonest-upcoming first and most-recent-past last', () => {
    const sorted = sortInvitations(
      [make('past-old', iso(-30)), make('soon', iso(2)), make('later', iso(20)), make('past-recent', iso(-1))],
      NOW,
    )

    expect(sorted.map((view) => view.id)).toEqual(['soon', 'later', 'past-recent', 'past-old'])
  })

  it('places undated invitations after upcoming but before past ones', () => {
    const sorted = sortInvitations([make('past', iso(-1)), make('undated', null), make('soon', iso(1))], NOW)
    expect(sorted.map((view) => view.id)).toEqual(['soon', 'undated', 'past'])
  })

  it('does not mutate its input', () => {
    const input = [make('past', iso(-1)), make('soon', iso(1))]
    sortInvitations(input, NOW)
    expect(input.map((view) => view.id)).toEqual(['past', 'soon'])
  })
})

describe('pendingCount', () => {
  it('counts only invitations the member has not answered', () => {
    expect(
      countPending([
        { rsvp: 'pending' },
        { rsvp: 'pending' },
        { rsvp: 'attending' },
        { rsvp: 'declined' },
        { rsvp: 'maybe' },
      ]),
    ).toBe(2)
  })

  it('is zero when everything is answered', () => {
    expect(countPending([{ rsvp: 'attending' }])).toBe(0)
    expect(countPending([])).toBe(0)
  })
})

describe('countByRsvp', () => {
  it('tallies every status for the admin roster, defaulting a null to pending', () => {
    expect(countByRsvp([{ rsvp: 'attending' }, { rsvp: 'attending' }, { rsvp: null }, { rsvp: 'maybe' }])).toEqual({
      pending: 1,
      attending: 2,
      declined: 0,
      maybe: 1,
    })
  })
})

describe('missing-migration detection', () => {
  it('recognises a missing event_invitations table', () => {
    expect(isMissingEventInvitationsTable({ code: '42P01' })).toBe(true)
    expect(isMissingEventInvitationsTable({ code: 'PGRST205' })).toBe(true)
    expect(
      isMissingEventInvitationsTable({ message: 'relation "public.event_invitations" does not exist' }),
    ).toBe(true)
    expect(isMissingEventInvitationsTable(null)).toBe(false)
    expect(isMissingEventInvitationsTable({ code: '23505', message: 'duplicate key' })).toBe(false)
  })

  it('recognises profiles missing the membership_status column', () => {
    expect(isMissingMemberStatusColumn({ code: '42703' })).toBe(true)
    expect(
      isMissingMemberStatusColumn({ message: "column profiles.membership_status does not exist" }),
    ).toBe(true)
    expect(isMissingMemberStatusColumn({ code: '23505', message: 'duplicate key' })).toBe(false)
  })
})
