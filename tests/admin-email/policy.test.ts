import { describe, expect, it } from 'vitest'
import { deliveryDecision } from '@/lib/admin-email/policy'
const ready = { status: 'scheduled', memberExists: true, sameEmail: true, suppressed: false, audienceEligible: true, couponPresent: false, couponAvailable: null }
describe('scheduled campaign delivery policy', () => {
  it('permits the intended eligible recipient', () => expect(deliveryDecision(ready)).toBe('send'))
  it('skips people who unsubscribed or no longer meet the audience', () => {
    expect(deliveryDecision({ ...ready, suppressed: true })).toBe('skip')
    expect(deliveryDecision({ ...ready, audienceEligible: false })).toBe('skip')
    expect(deliveryDecision({ ...ready, sameEmail: false })).toBe('skip')
    expect(deliveryDecision({ ...ready, memberExists: false })).toBe('skip')
  })
  it('skips an expired coupon, but holds an unverifiable coupon', () => {
    expect(deliveryDecision({ ...ready, couponPresent: true, couponAvailable: false })).toBe('skip')
    expect(deliveryDecision({ ...ready, couponPresent: true, couponAvailable: null })).toBe('hold')
  })
  it('blocks sending when a campaign is cancelled or unavailable', () => {
    expect(deliveryDecision({ ...ready, status: 'cancelled' })).toBe('skip')
    expect(deliveryDecision({ ...ready, status: 'unknown' })).toBe('hold')
  })
})
