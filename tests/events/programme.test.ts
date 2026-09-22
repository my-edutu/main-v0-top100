import { describe, expect, it } from 'vitest'

import {
  PROGRAMME_SCHEDULE,
  PROGRAMME_SESSION_MINUTES,
  validateProgrammeEventInput,
} from '@/lib/events/programme'

describe('October 2026 programme schedule', () => {
  it('contains onboarding and the ten approved October sessions', () => {
    expect(PROGRAMME_SCHEDULE).toHaveLength(11)
    expect(PROGRAMME_SCHEDULE[0]).toMatchObject({
      sessionNumber: 0,
      date: '2026-10-10',
      time: '16:00',
      title: 'Africa Future Leaders 2026: Cohort Onboarding',
    })
    expect(PROGRAMME_SCHEDULE.at(-1)).toMatchObject({
      sessionNumber: 10,
      date: '2026-10-31',
      time: '16:00',
      title: 'The 10-Year Question: What Will Your Leadership Have Changed?',
    })
    expect(PROGRAMME_SCHEDULE.every((item) => item.durationMinutes === PROGRAMME_SESSION_MINUTES)).toBe(true)
  })

  it('rejects programme events longer than one hour', () => {
    expect(() => validateProgrammeEventInput({
      startAt: '2026-10-11T16:00:00+01:00',
      endAt: '2026-10-11T17:01:00+01:00',
    })).toThrow('60 minutes')
  })

  it('rejects an end time before the start time', () => {
    expect(() => validateProgrammeEventInput({
      startAt: '2026-10-11T16:00:00+01:00',
      endAt: '2026-10-11T15:00:00+01:00',
    })).toThrow('after the start')
  })
})
