import { describe, expect, it } from 'vitest'

import {
  extractEdutuOpportunities,
  normalizeEdutuOpportunity,
} from '@/lib/opportunities/edutu-proxy'

describe('Edutu opportunity proxy contract', () => {
  it('extracts the paginated data envelope returned by Edutu v1', () => {
    expect(
      extractEdutuOpportunities({
        object: 'list',
        data: [{ id: 'edutu-1', title: 'Africa Grant', category: 'grant' }],
        meta: { hasMore: true, nextOffset: 25 },
      }),
    ).toEqual([{ id: 'edutu-1', title: 'Africa Grant', category: 'grant' }])
  })

  it('maps Edutu fields into the Top100 public feed shape', () => {
    expect(
      normalizeEdutuOpportunity(
        {
          id: 'edutu-1',
          title: 'Africa Grant',
          category: 'grant',
          organization: 'Example Foundation',
          location: 'Remote',
          deadline: '2026-12-01T00:00:00.000Z',
          applyUrl: 'https://apply.example.org',
        },
        0,
      ),
    ).toEqual({
      id: 'edutu-1',
      title: 'Africa Grant',
      type: 'Grant',
      location: 'Remote',
      deadline: '2026-12-01T00:00:00.000Z',
    })
  })

  it('uses a stable fallback id and safe display defaults', () => {
    expect(normalizeEdutuOpportunity({}, 3)).toEqual({
      id: 'edutu-4',
      title: 'Scholarship opportunity',
      type: 'Scholarship',
      location: 'Online',
      deadline: 'Rolling',
    })
  })
})
