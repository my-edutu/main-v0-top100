import { describe, expect, it } from 'vitest'
import { MAX_ACTIVE_AWARDEES_PER_AGENT, planFairAssignment } from '@/lib/assignment'
import { buildImportPreview, buildExistingLookup, suggestMapping, toCommitRows } from '@/lib/import'

describe('awardee assignment capacity', () => {
  it('never assigns beyond 100 active awardees per agent', () => {
    const candidates = Array.from({ length: 5 }, (_, index) => ({ id: `new-${index}`, country: 'Nigeria' }))
    const assignments = planFairAssignment(
      candidates,
      [
        { id: 'full', assignedCount: 100 },
        { id: 'one-left', assignedCount: 99 },
      ],
    )

    expect(MAX_ACTIVE_AWARDEES_PER_AGENT).toBe(100)
    expect(assignments).toEqual([{ awardeeId: 'new-0', agentId: 'one-left' }])
  })

  it('fills the least-loaded rep until capacity before moving to the next', () => {
    const assignments = planFairAssignment(
      Array.from({ length: 3 }, (_, index) => ({ id: `new-${index}` })),
      [
        { id: 'a', assignedCount: 98 },
        { id: 'b', assignedCount: 99 },
      ],
    )

    expect(assignments).toEqual([
      { awardeeId: 'new-0', agentId: 'a' },
      { awardeeId: 'new-1', agentId: 'a' },
      { awardeeId: 'new-2', agentId: 'b' },
    ])
  })

  it('uses a larger administrator-configured cap when planning a batch', () => {
    const assignments = planFairAssignment(
      Array.from({ length: 4 }, (_, index) => ({ id: `new-${index}` })),
      [{ id: 'rep', assignedCount: 100 }],
      'least_loaded',
      125,
    )

    expect(assignments).toHaveLength(4)
    expect(assignments.every((assignment) => assignment.agentId === 'rep')).toBe(true)
  })
})

describe('payment identity import', () => {
  it('maps and carries an explicit public awardee ID into the import commit rows', () => {
    const headers = ['Public Awardee ID', 'Full Name', 'Email Address']
    const mapping = suggestMapping(headers)
    const id = '12a56d78-1234-4abc-8def-0123456789ab'
    const preview = buildImportPreview(
      [{ 'Public Awardee ID': id, 'Full Name': 'Ada Okafor', 'Email Address': 'ada@example.com' }],
      mapping,
      buildExistingLookup([]),
    )

    expect(preview.errors).toEqual([])
    expect(toCommitRows(preview.rows, 'insert')[0].public_awardee_id).toBe(id)
  })

  it('rejects a malformed public awardee ID instead of sending it to Postgres', () => {
    const headers = ['Public Awardee ID', 'Full Name', 'Email Address']
    const preview = buildImportPreview(
      [{ 'Public Awardee ID': 'not-a-uuid', 'Full Name': 'Ada Okafor', 'Email Address': 'ada@example.com' }],
      suggestMapping(headers),
      buildExistingLookup([]),
    )

    expect(preview.errors.some((error) => error.field === 'public_awardee_id')).toBe(true)
    expect(preview.rows).toHaveLength(0)
  })
})
