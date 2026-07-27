import { describe, expect, it } from 'vitest'

import {
  daysUntilDeadline,
  formatDeadlineCountdown,
  formatDeadlineDate,
  isDeadlinePast,
} from '@/lib/opportunities/types'

// A fixed "now" late in the day, so any bug that compares instants rather than
// calendar days shows up immediately.
const now = new Date('2026-07-27T22:30:00')

describe('formatDeadlineCountdown', () => {
  it('says "Closes today" on the deadline day itself', () => {
    expect(formatDeadlineCountdown('2026-07-27', now)).toBe('Closes today')
  })

  it('says "Closes tomorrow" the day before', () => {
    expect(formatDeadlineCountdown('2026-07-28', now)).toBe('Closes tomorrow')
  })

  it('counts whole days for anything further out', () => {
    expect(formatDeadlineCountdown('2026-08-02', now)).toBe('Closes in 6 days')
    expect(formatDeadlineCountdown('2026-07-29', now)).toBe('Closes in 2 days')
  })

  it('says "Closed" once the deadline day has passed', () => {
    expect(formatDeadlineCountdown('2026-07-26', now)).toBe('Closed')
    expect(formatDeadlineCountdown('2020-01-01', now)).toBe('Closed')
  })

  it('says "Rolling" when there is no deadline', () => {
    expect(formatDeadlineCountdown(null, now)).toBe('Rolling')
    expect(formatDeadlineCountdown(undefined, now)).toBe('Rolling')
    expect(formatDeadlineCountdown('', now)).toBe('Rolling')
  })

  it('handles a full timestamp as well as a bare date column', () => {
    expect(formatDeadlineCountdown('2026-07-28T00:00:00Z', now)).toBe('Closes tomorrow')
  })

  it('is not thrown off by a month or year boundary', () => {
    expect(formatDeadlineCountdown('2026-08-01', new Date('2026-07-31T23:00:00'))).toBe('Closes tomorrow')
    expect(formatDeadlineCountdown('2027-01-01', new Date('2026-12-31T01:00:00'))).toBe('Closes tomorrow')
  })
})

describe('daysUntilDeadline / isDeadlinePast', () => {
  it('returns null for an undated listing, which therefore never expires', () => {
    expect(daysUntilDeadline(null, now)).toBeNull()
    expect(isDeadlinePast(null, now)).toBe(false)
  })

  it('is not past on the deadline day itself', () => {
    expect(daysUntilDeadline('2026-07-27', now)).toBe(0)
    expect(isDeadlinePast('2026-07-27', now)).toBe(false)
  })

  it('is past the day after', () => {
    expect(isDeadlinePast('2026-07-26', now)).toBe(true)
  })
})

describe('formatDeadlineDate', () => {
  it('renders a date column as a short human date', () => {
    expect(formatDeadlineDate('2026-08-01')).toBe('1 Aug 2026')
  })

  it('renders a missing deadline as Rolling', () => {
    expect(formatDeadlineDate(null)).toBe('Rolling')
  })
})
