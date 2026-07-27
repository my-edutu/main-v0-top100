import { describe, it, expect } from 'vitest'
import { mergeOpportunities, type CuratedOpportunity } from '@/lib/opportunities-server'
import type { HubOpportunity } from '@/lib/member-hub'

const curated = (over: Partial<CuratedOpportunity>): CuratedOpportunity => ({
  id: 'c1',
  title: 'AFL Leadership Workshop',
  type: 'Workshop',
  location: 'Lagos',
  deadline: 'Aug 20',
  description: null,
  url: null,
  memberOnly: false,
  source: 'afl',
  ...over,
})

const external: HubOpportunity[] = [
  { id: 'e1', title: 'Climate Fellowship', type: 'Fellowship', location: 'Remote', deadline: 'Sep 01' },
]

describe('mergeOpportunities', () => {
  it('puts curated listings ahead of the external feed', () => {
    const result = mergeOpportunities([curated({})], external, { isMember: true })
    expect(result[0].id).toBe('c1')
    expect(result[1].id).toBe('e1')
  })

  it('hides member-only listings from a public caller', () => {
    const result = mergeOpportunities([curated({ memberOnly: true })], external, { isMember: false })
    expect(result.map((o) => o.id)).toEqual(['e1'])
  })

  it('shows member-only listings to a member', () => {
    const result = mergeOpportunities([curated({ memberOnly: true })], external, { isMember: true })
    expect(result.map((o) => o.id)).toEqual(['c1', 'e1'])
  })

  it('never leaks a member-only listing even when its type is requested', () => {
    const result = mergeOpportunities([curated({ memberOnly: true, type: 'Workshop' })], [], {
      isMember: false,
      type: 'Workshop',
    })
    expect(result).toEqual([])
  })

  it('filters by type across both sources', () => {
    const result = mergeOpportunities([curated({ type: 'Workshop' })], external, {
      isMember: true,
      type: 'Fellowship',
    })
    expect(result.map((o) => o.id)).toEqual(['e1'])
  })

  it('treats the type filter case-insensitively', () => {
    const result = mergeOpportunities([curated({ type: 'Workshop' })], [], { isMember: true, type: 'workshop' })
    expect(result.map((o) => o.id)).toEqual(['c1'])
  })

  it('returns everything when no type is given', () => {
    expect(mergeOpportunities([curated({})], external, { isMember: true })).toHaveLength(2)
  })

  it('drops an external item whose id collides with a curated one', () => {
    const collide: HubOpportunity[] = [{ id: 'c1', title: 'Dupe', type: 'Grant', location: 'X', deadline: 'Y' }]
    const result = mergeOpportunities([curated({})], collide, { isMember: true })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('AFL Leadership Workshop')
  })

  it('handles empty inputs', () => {
    expect(mergeOpportunities([], [], { isMember: true })).toEqual([])
  })
})
