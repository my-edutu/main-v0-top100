import { describe, expect, it } from 'vitest'

import { magazineFeaturePrice, mapMagazinePaymentView } from '@/lib/magazine/payment'

const campaign = {
  id: 'afl-magazine-2026',
  title: 'Africa Future Leaders Magazine Feature',
  description: 'Apply for editorial consideration.',
  ngnAmountMinor: 1_000_000,
  usdAmountMinor: 1_000,
  priceVersion: 'afl-magazine-2026-v1',
  applicationOpen: true,
}

describe('magazine feature pricing and payment projection', () => {
  it('uses campaign-configured prices in exact minor units independently of the award fee', () => {
    expect(magazineFeaturePrice(campaign, 'NGN')).toEqual({ currency: 'NGN', amountMinor: 1_000_000, bachsAmount: '10000.00', display: '₦10,000', priceVersion: 'afl-magazine-2026-v1' })
    expect(magazineFeaturePrice(campaign, 'USD')).toEqual({ currency: 'USD', amountMinor: 1_000, bachsAmount: '10.00', display: '$10', priceVersion: 'afl-magazine-2026-v1' })
  })

  it('returns only a safe, truthful pending projection for an unpaid magazine payment', () => {
    expect(mapMagazinePaymentView(campaign, { status: 'pending' }, [{ id: 'attempt', status: 'open', currency: 'NGN', requested_amount_minor: 1_000_000 }])).toMatchObject({
      campaign,
      orderStatus: 'pending',
      currentAttempt: { id: 'attempt', status: 'open', currency: 'NGN', amountMinor: 1_000_000 },
      applicationEligible: false,
    })
    expect(JSON.stringify(mapMagazinePaymentView(campaign, { status: 'pending' }, [{ id: 'attempt', status: 'open', currency: 'NGN', requested_amount_minor: 1_000_000, provider_response: { secret: 'do-not-leak' } }]))).not.toContain('secret')
  })

  it('unlocks only from paid magazine status, not award payment', () => {
    expect(mapMagazinePaymentView(campaign, { status: 'unpaid' }, []).applicationEligible).toBe(false)
    expect(mapMagazinePaymentView(campaign, { status: 'paid' }, []).applicationEligible).toBe(true)
  })
})
