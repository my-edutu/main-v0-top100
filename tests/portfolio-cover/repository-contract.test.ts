import { describe, expect, it } from 'vitest'

import { mapPortfolioGenerationRow, portfolioObjectPath } from '@/lib/portfolio-cover/repository'

describe('portfolio cover repository contract', () => {
  it('uses member-scoped opaque object paths', () => {
    expect(portfolioObjectPath('member-1', 'generation-1', 'source')).toBe('member-1/generation-1/source.png')
    expect(portfolioObjectPath('member-1', 'generation-1', 'executive-charcoal')).toBe('member-1/generation-1/executive-charcoal.png')
  })

  it('maps database rows without exposing private paths', () => {
    const result = mapPortfolioGenerationRow({
      id: 'generation-1', member_id: 'member-1', status: 'ready', tailoring: 'female',
      fields: { name: 'Ada' }, attempt: 1, options: { 'executive-charcoal': 'private/path' },
      selected_variant: null, selected_url: null, failure_code: null,
      created_at: '2026-09-04T00:00:00.000Z', updated_at: '2026-09-04T00:00:00.000Z',
    })
    expect(result).toMatchObject({ id: 'generation-1', memberId: 'member-1', status: 'ready', attempt: 1 })
    expect(result.options).toEqual({})
  })
})
