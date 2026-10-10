import { describe, expect, it } from 'vitest'
import { PROGRAMME_ARTWORK } from '@/lib/events/programme-artwork'
import { PROGRAMME_SCHEDULE } from '@/lib/events/programme'

describe('programme artwork', () => {
  it('has one local cover and exact title metadata for onboarding and all ten sessions', () => {
    expect(Object.keys(PROGRAMME_ARTWORK)).toHaveLength(11)
    for (const item of PROGRAMME_SCHEDULE) {
      expect(PROGRAMME_ARTWORK[item.sessionNumber]?.title).toBe(item.title)
      expect(PROGRAMME_ARTWORK[item.sessionNumber]?.src).toMatch(new RegExp(`^/programme/afl-october-2026/.+\\.${item.sessionNumber === 0 ? 'jpg' : 'png'}$`))
    }
  })
})
