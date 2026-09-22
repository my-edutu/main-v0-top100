import { describe, expect, it } from 'vitest'

import { isAfricaFutureLeadersProgrammeEvent, toAdminProgrammeEvent, toMemberProgrammeEvent } from '@/lib/events/programme-api'

describe('programme event API projections', () => {
  it('hides a draft speaker from the member projection', () => {
    const result = toMemberProgrammeEvent({
      id: 'e1',
      title: 'A programme event',
      status: 'published',
      visibility: 'public',
      speaker: { status: 'draft', name: 'Hidden' },
    })

    expect(result.speaker).toBeNull()
  })

  it('keeps legacy events valid when programme columns are null', () => {
    expect(toMemberProgrammeEvent({ id: 'legacy', title: 'Legacy', speaker_id: null })).toMatchObject({
      sessionNumber: null,
      speaker: null,
      learningOutcomes: [],
      timezone: 'Africa/Lagos',
    })
  })

  it('does not classify unrelated legacy events as programme sessions', () => {
    expect(isAfricaFutureLeadersProgrammeEvent({ programme_label: null, session_number: null })).toBe(false)
    expect(isAfricaFutureLeadersProgrammeEvent({ programme_label: 'Africa Future Leaders October 2026', session_number: 10 })).toBe(true)
  })

  it('keeps full speaker fields available to the admin projection', () => {
    const result = toAdminProgrammeEvent({
      id: 'e2',
      title: 'Admin event',
      speaker: { id: 's1', status: 'draft', name: 'Amara', biography: 'Private draft bio' },
      session_number: 2,
      learning_outcomes: ['Build useful authority'],
    })

    expect(result).toMatchObject({
      speaker: { id: 's1', name: 'Amara', biography: 'Private draft bio' },
      sessionNumber: 2,
      learningOutcomes: ['Build useful authority'],
    })
  })
})
