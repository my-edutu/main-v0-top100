import { describe, expect, it } from 'vitest'
import { awardPopupDay, awardPopupStorageKey, canOfferPhysicalAward, nextAwardPopupVisit, readAwardPopupVisit } from '@/lib/awards/popup'
import type { AwardPaymentView } from '@/lib/awards/payment'

const unpaid: AwardPaymentView = {
  status: 'unpaid', needsPayment: true, checkoutEnabled: true,
  priceOptions: [{ currency: 'NGN', amountMinor: 2_500_000, display: '₦25,000' }],
  currentAttempt: null, confirmedPayment: null,
}

describe('separate award popup visits', () => {
  it('shuffles the initial style and remembers it for the login', () => {
    const visit = nextAwardPopupVisit(null, 4, '2026-10-11', 2)
    expect(visit?.variant).toBe(2)
    expect(nextAwardPopupVisit(visit, 4, '2026-10-11')).toBeNull()
  })
  it('uses a different design at the next login on the same day', () => {
    expect(nextAwardPopupVisit({ day: '2026-10-11', login: 4, variant: 0 }, 5, '2026-10-11')?.variant).toBe(1)
  })
  it('does not show again on another day within the same login', () => {
    expect(nextAwardPopupVisit({ day: '2026-10-11', login: 4, variant: 1 }, 4, '2026-10-12')).toBeNull()
  })
  it('cycles through all six designs across logins without consecutive repetitions', () => {
    expect(nextAwardPopupVisit({ day: '2026-10-11', login: 4, variant: 2 }, 5, '2026-10-11')?.variant).toBe(3)
    expect(nextAwardPopupVisit({ day: '2026-10-11', login: 4, variant: 5 }, 5, '2026-10-11')?.variant).toBe(0)
  })
  it('scopes preferences to the member and handles corrupt saved preferences', () => {
    expect(awardPopupStorageKey('a')).not.toBe(awardPopupStorageKey('b'))
    expect(readAwardPopupVisit('broken')).toBeNull()
    expect(readAwardPopupVisit('{"day":"2026-10-11","login":1,"variant":8}')).toBeNull()
  })
  it('uses Lagos dates across the UTC date boundary', () => {
    expect(awardPopupDay(new Date('2026-10-11T23:30:00Z'))).toBe('2026-10-12')
  })
})

describe('award offer payment eligibility', () => {
  it('requires confirmed price data and an open checkout', () => {
    expect(canOfferPhysicalAward(unpaid)).toBe(true)
    expect(canOfferPhysicalAward(null)).toBe(false)
    expect(canOfferPhysicalAward({ ...unpaid, priceOptions: [] })).toBe(false)
    expect(canOfferPhysicalAward({ ...unpaid, checkoutEnabled: false })).toBe(false)
  })
  it('never offers another purchase to a paid awardee', () => {
    expect(canOfferPhysicalAward({ ...unpaid, status: 'paid', needsPayment: false })).toBe(false)
    expect(canOfferPhysicalAward({ ...unpaid, confirmedPayment: { currency: 'NGN', amountMinor: 2_500_000, paidAt: '2026-10-11T00:00:00Z' } })).toBe(false)
  })
  it('suppresses pending payments and open checkout attempts', () => {
    expect(canOfferPhysicalAward({ ...unpaid, status: 'pending' })).toBe(false)
    expect(canOfferPhysicalAward({ ...unpaid, currentAttempt: { id: 'a', currency: 'NGN', amountMinor: 2_500_000, status: 'pending', expiresAt: null } })).toBe(false)
  })
  it('allows a failed payment retry but not a refunded payment', () => {
    expect(canOfferPhysicalAward({ ...unpaid, status: 'failed' })).toBe(true)
    expect(canOfferPhysicalAward({ ...unpaid, status: 'refunded' })).toBe(false)
  })
})
