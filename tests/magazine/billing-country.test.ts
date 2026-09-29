import { describe, expect, it } from 'vitest'

import { magazineBillingCurrency } from '@/lib/magazine/billing-country'

describe('magazine billing country currency', () => {
  it('charges Nigeria in naira and other countries in US dollars', () => {
    expect(magazineBillingCurrency('NG')).toBe('NGN')
    expect(magazineBillingCurrency('GB')).toBe('USD')
    expect(magazineBillingCurrency('US')).toBe('USD')
  })

  it('rejects unsupported country codes instead of silently treating them as international', () => {
    expect(() => magazineBillingCurrency('ZZ')).toThrow('Select a valid country.')
  })
})
