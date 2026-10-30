import { describe, expect, it } from 'vitest'
import { toAwardeeFilters } from '@/lib/awardee-filters'
import { workdayDate } from '@/lib/workday'

describe('awardee directory navigation', () => {
  it('keeps a stable default order and honours a selected follow-up sort', () => {
    expect(toAwardeeFilters({}, 'seed').sort).toBe('name')
    expect(toAwardeeFilters({ sort: 'followup' }, 'seed').sort).toBe('followup')
  })
  it('preserves explicit shuffle seed, filters and pagination', () => {
    expect(
      toAwardeeFilters(
        {
          sort: 'shuffle',
          shuffle: 'saved-seed',
          page: '2',
          contact: 'not_contacted',
          payment: 'unpaid',
        },
        'new-seed',
      ),
    ).toMatchObject({
      sort: 'shuffle',
      shuffleSeed: 'saved-seed',
      page: 2,
      contactStatus: 'not_contacted',
      paymentStatus: ['unpaid'],
    })
  })
  it('normalizes invalid paging and filters rather than querying invalid states', () => {
    expect(
      toAwardeeFilters(
        {
          sort: 'invalid',
          page: 'Infinity',
          assignment: 'invalid',
          followup: 'invalid',
        },
        'seed',
      ),
    ).toMatchObject({ sort: 'name', page: 1, assignment: '', followUp: '' })
  })
})

describe('sales workday', () => {
  it('uses the Nigerian business date around UTC midnight', () => {
    expect(workdayDate(new Date('2026-10-30T23:30:00Z'))).toBe('2026-10-31')
    expect(workdayDate(new Date('2026-10-30T22:30:00Z'))).toBe('2026-10-30')
  })
})
