import { describe, expect, it } from 'vitest'

import { sortForMember, visibleTiersFor } from '@/lib/opportunities/server'
import type { Opportunity, OpportunityVisibility } from '@/lib/opportunities/types'

describe('visibleTiersFor', () => {
  it('gives a signed-out caller the public tier only', () => {
    expect(visibleTiersFor(null)).toEqual(['public'])
    expect(visibleTiersFor(undefined)).toEqual(['public'])
  })

  it('gives a signed-in, non-approved member the public and members tiers', () => {
    expect(visibleTiersFor({ status: 'pending' })).toEqual(['public', 'members'])
  })

  it('gives an approved member all three tiers', () => {
    expect(visibleTiersFor({ status: 'approved' })).toEqual(['public', 'members', 'approved'])
  })

  // profiles.membership_status does not exist on every database this ships to,
  // so an unreadable status must resolve to the LEAST privileged member tier.
  // Failing open here would hand approved-only listings to everyone.
  it('treats a missing or unreadable status as not approved', () => {
    expect(visibleTiersFor({})).toEqual(['public', 'members'])
    expect(visibleTiersFor({ status: undefined })).toEqual(['public', 'members'])
    expect(visibleTiersFor({ status: null })).toEqual(['public', 'members'])
  })

  it('never grants the approved tier to a rejected or suspended member', () => {
    expect(visibleTiersFor({ status: 'rejected' })).not.toContain('approved')
    expect(visibleTiersFor({ status: 'suspended' })).not.toContain('approved')
    expect(visibleTiersFor({ status: 'Approved' })).not.toContain('approved')
    expect(visibleTiersFor({ status: 'approved ' })).not.toContain('approved')
  })
})

/**
 * Stand-in for the server-side `.in('visibility', tiers)` filter, so the
 * exclusion rule is asserted on the same tier list the route uses.
 */
function rowsVisibleTo(
  member: { status?: string | null } | null,
  rows: { title: string; visibility: OpportunityVisibility }[],
) {
  const tiers = visibleTiersFor(member)
  return rows.filter((row) => tiers.includes(row.visibility)).map((row) => row.title)
}

describe('tier filtering excludes exclusive rows', () => {
  const rows: { title: string; visibility: OpportunityVisibility }[] = [
    { title: 'Open grant', visibility: 'public' },
    { title: 'Network fellowship', visibility: 'members' },
    { title: 'Awardee-only residency', visibility: 'approved' },
  ]

  it('hides members and approved rows from a signed-out caller', () => {
    expect(rowsVisibleTo(null, rows)).toEqual(['Open grant'])
  })

  it('hides approved rows from a pending member', () => {
    expect(rowsVisibleTo({ status: 'pending' }, rows)).toEqual(['Open grant', 'Network fellowship'])
  })

  it('shows everything to an approved member', () => {
    expect(rowsVisibleTo({ status: 'approved' }, rows)).toHaveLength(3)
  })
})

function makeOpportunity(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: overrides.title ?? 'id',
    title: 'Untitled',
    slug: 'untitled',
    type: 'Grant',
    organization: null,
    location: null,
    summary: null,
    description: null,
    applicationUrl: null,
    contactEmail: null,
    deadline: null,
    amountNote: null,
    visibility: 'members',
    isFeatured: false,
    status: 'published',
    isSaved: false,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('sortForMember', () => {
  const now = new Date('2026-07-27T09:00:00Z')

  it('puts non-expired first, then featured, then soonest deadline, then rolling', () => {
    const sorted = sortForMember(
      [
        makeOpportunity({ title: 'expired', deadline: '2026-07-01' }),
        makeOpportunity({ title: 'rolling' }),
        makeOpportunity({ title: 'soon', deadline: '2026-08-01' }),
        makeOpportunity({ title: 'later', deadline: '2026-09-01' }),
        makeOpportunity({ title: 'featured-later', deadline: '2026-10-01', isFeatured: true }),
      ],
      now,
    ).map((row) => row.title)

    expect(sorted).toEqual(['featured-later', 'soon', 'later', 'rolling', 'expired'])
  })

  it('does not mutate its input', () => {
    const input = [
      makeOpportunity({ title: 'b', deadline: '2026-09-01' }),
      makeOpportunity({ title: 'a', deadline: '2026-08-01' }),
    ]
    sortForMember(input, now)
    expect(input.map((row) => row.title)).toEqual(['b', 'a'])
  })
})
