import { describe, expect, it } from 'vitest'

import { summarizeAdminOpportunities } from '@/lib/opportunities/admin-summary'

describe('summarizeAdminOpportunities', () => {
  it('counts restricted visibility without mislabelling approved-only listings', () => {
    const summary = summarizeAdminOpportunities([
      { status: 'published', visibility: 'public' },
      { status: 'draft', visibility: 'members' },
      { status: 'draft', visibility: 'approved' },
      { status: 'archived', visibility: 'public' },
    ])

    expect(summary).toEqual({
      total: 4,
      published: 1,
      restricted: 2,
      drafts: 2,
    })
  })
})
