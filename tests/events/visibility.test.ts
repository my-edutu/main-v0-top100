import { describe, expect, it } from 'vitest'
import { EVENT_VISIBILITIES, isPublicEventVisibility } from '@/lib/events/visibility'

describe('event visibility', () => {
  it('supports public, awardee-only, and private modes', () => {
    expect(EVENT_VISIBILITIES).toEqual(['public', 'awardee_only', 'private'])
    expect(isPublicEventVisibility('public')).toBe(true)
    expect(isPublicEventVisibility('awardee_only')).toBe(false)
    expect(isPublicEventVisibility('private')).toBe(false)
  })
})
