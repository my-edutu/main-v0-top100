import { describe, expect, it } from 'vitest'

import { mergeDateAndTime, validateProgrammeForm } from '@/app/admin/events/event-time-fields'

describe('programme event editor validation', () => {
  it('allows exactly 60 minutes and rejects 61 minutes', () => {
    expect(validateProgrammeForm({ startAt: '2026-10-11T16:00', endAt: '2026-10-11T17:00' })).toEqual({ ok: true })
    expect(validateProgrammeForm({ startAt: '2026-10-11T16:00', endAt: '2026-10-11T17:01' })).toMatchObject({ ok: false })
  })

  it('retains the selected date when the clock value changes', () => {
    expect(mergeDateAndTime('2026-10-11', '18:00')).toBe('2026-10-11T18:00')
  })
})
