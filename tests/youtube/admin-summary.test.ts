import { describe, expect, it } from 'vitest'

import { summarizeAdminVideos } from '@/lib/youtube/admin-summary'

describe('summarizeAdminVideos', () => {
  it('derives channel totals from saved video dates without invented engagement data', () => {
    const summary = summarizeAdminVideos(
      [
        { date: '2026-08-20' },
        { date: '2026-06-15' },
        { date: '2025-12-01' },
        { date: '' },
        { date: 'not-a-date' },
      ],
      new Date('2026-09-07T12:00:00Z'),
    )

    expect(summary).toEqual({
      total: 5,
      dated: 3,
      recent: 2,
      missingDate: 2,
    })
  })
})
