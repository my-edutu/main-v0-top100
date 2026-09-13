import { afterEach, describe, expect, it } from 'vitest'

import { awardFee, formatAwardFee, parseBachsAmount } from '@/lib/payments/bachs/money'

afterEach(() => {
  delete process.env.AWARD_FEE_NGN_MINOR
  delete process.env.AWARD_FEE_USD_MINOR
  delete process.env.AWARD_PRICE_VERSION
})

describe('Bachs award prices', () => {
  it('uses the server-owned NGN and USD defaults', () => {
    expect(awardFee('NGN')).toEqual({
      currency: 'NGN',
      amountMinor: 2_500_000,
      bachsAmount: '25000.00',
      display: '₦25,000',
      priceVersion: 'afl-award-2026-v1',
    })
    expect(awardFee('USD')).toEqual({
      currency: 'USD',
      amountMinor: 2_000,
      bachsAmount: '20.00',
      display: '$20',
      priceVersion: 'afl-award-2026-v1',
    })
  })

  it('accepts only explicit overrides that preserve the fixed price contract', () => {
    process.env.AWARD_FEE_NGN_MINOR = '2500000'
    process.env.AWARD_FEE_USD_MINOR = '2000'
    process.env.AWARD_PRICE_VERSION = 'afl-award-2026-v2'

    expect(awardFee('NGN')).toMatchObject({ amountMinor: 2_500_000, bachsAmount: '25000.00', display: '₦25,000', priceVersion: 'afl-award-2026-v2' })
    expect(awardFee('USD')).toMatchObject({ amountMinor: 2_000, bachsAmount: '20.00', display: '$20' })
    process.env.AWARD_FEE_NGN_MINOR = '3000000'
    expect(() => awardFee('NGN')).toThrow(/fixed|2500000/i)
  })
})

describe('Bachs decimal money', () => {
  it('parses exact two-decimal major-unit strings', () => {
    expect(parseBachsAmount('20.00', 'USD')).toBe(2_000)
    expect(parseBachsAmount('25000.00', 'NGN')).toBe(2_500_000)
    expect(parseBachsAmount('0.00', 'USD')).toBe(0)
  })

  it('rejects malformed, wrong-scale, negative, and unsafe amounts', () => {
    for (const value of ['20', '20.0', '20.001', '-20.00', '+20.00', '01.00', 'NaN', '1e2.00', '']) {
      expect(() => parseBachsAmount(value, 'USD')).toThrow()
    }
    expect(() => parseBachsAmount('90071992547409.92', 'USD')).toThrow(/range/i)
  })

  it('formats a fixed minor-unit amount without floating point arithmetic', () => {
    expect(formatAwardFee(2_500_000, 'NGN')).toBe('₦25,000')
    expect(formatAwardFee(2_550, 'USD')).toBe('$25.50')
  })
})
