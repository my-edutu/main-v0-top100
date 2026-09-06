import { describe, expect, it } from 'vitest'

import { selectHomeOpportunities } from '@/lib/dashboard/home-opportunities'
import type { Opportunity } from '@/lib/opportunities/types'

function opportunity(
  id: string,
  deadline: string | null,
  status: Opportunity['status'] = 'published',
): Opportunity {
  return {
    id,
    title: `Opportunity ${id}`,
    slug: `opportunity-${id}`,
    type: 'Fellowship',
    organization: 'Top100 AFL',
    location: 'Remote',
    summary: null,
    description: null,
    applicationUrl: null,
    contactEmail: null,
    deadline,
    amountNote: null,
    visibility: 'members',
    isFeatured: false,
    status,
    isSaved: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

describe('dashboard home opportunities', () => {
  it('shows only the next three actionable published deadlines in date order', () => {
    const result = selectHomeOpportunities(
      [
        opportunity('late', '2026-10-15'),
        opportunity('expired', '2026-09-03'),
        opportunity('soon', '2026-09-05'),
        opportunity('closed', '2026-09-06', 'closed'),
        opportunity('third', '2026-09-30'),
        opportunity('second', '2026-09-12'),
        opportunity('rolling', null),
      ],
      new Date('2026-09-04T12:00:00+01:00'),
    )

    expect(result.map((item) => item.id)).toEqual(['soon', 'second', 'third'])
  })

  it('returns an empty preview when there are no dated live opportunities', () => {
    expect(
      selectHomeOpportunities(
        [opportunity('rolling', null), opportunity('draft', '2026-09-20', 'draft')],
        new Date('2026-09-04T12:00:00+01:00'),
      ),
    ).toEqual([])
  })
})
