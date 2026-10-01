import { describe, expect, it } from 'vitest'
import { shouldPinAwardAction } from '@/lib/awards/award-action-pinning'

describe('award action pinning', () => {
  it('pins after the inline action reaches the top of a scrolled viewport', () => {
    expect(shouldPinAwardAction(0, 726, 814)).toBe(false)
    expect(shouldPinAwardAction(600, 97, 814)).toBe(true)
  })

  it('returns the action to its card when scrolling back up', () => {
    expect(shouldPinAwardAction(450, 247, 814)).toBe(false)
    expect(shouldPinAwardAction(0, 726, 814)).toBe(false)
  })
})
