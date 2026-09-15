import { describe, expect, it } from 'vitest'

import { awardAccessRedirect } from '@/lib/awards/access'
import type { AwardPaymentView } from '@/lib/awards/payment'

const baseView: AwardPaymentView = {
  status: 'unpaid',
  priceOptions: [],
  currentAttempt: null,
  confirmedPayment: null,
  needsPayment: true,
}

describe('award access', () => {
  it('redirects members who have not completed payment', () => {
    expect(awardAccessRedirect(baseView)).toBe('/dashboard/me/award?intro=continued')
  })

  it('allows members with a confirmed payment to view their awards', () => {
    expect(
      awardAccessRedirect({
        ...baseView,
        status: 'paid',
        needsPayment: false,
        confirmedPayment: { currency: 'NGN', amountMinor: 2_500_000, paidAt: '2026-09-14T00:00:00.000Z' },
      }),
    ).toBeNull()
  })
})
