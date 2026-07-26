import { describe, it, expect, afterEach } from 'vitest'
import {
  DEFAULT_AWARD_PRICE_KOBO,
  awardPriceKobo,
  formatNaira,
  totalKobo,
} from '@/lib/awards/money'

afterEach(() => {
  delete process.env.AWARD_PRICE_KOBO
})

describe('formatNaira', () => {
  it('formats the award price with thousands separators', () => {
    expect(formatNaira(2_000_000)).toBe('₦20,000')
  })

  it('formats a shipping cost', () => {
    expect(formatNaira(350_000)).toBe('₦3,500')
  })

  it('renders a kobo remainder as decimals', () => {
    expect(formatNaira(2_000_050)).toBe('₦20,000.50')
  })

  it('formats zero', () => {
    expect(formatNaira(0)).toBe('₦0')
  })
})

describe('totalKobo', () => {
  it('adds the award price and shipping', () => {
    expect(totalKobo(2_000_000, 350_000)).toBe(2_350_000)
  })

  it('rejects a fractional amount rather than rounding it', () => {
    expect(() => totalKobo(2_000_000, 350.5)).toThrow(/integer/)
  })

  it('rejects a negative amount', () => {
    expect(() => totalKobo(2_000_000, -1)).toThrow(/integer/)
  })
})

describe('awardPriceKobo', () => {
  it('defaults to ₦20,000 when the env var is unset', () => {
    expect(awardPriceKobo()).toBe(DEFAULT_AWARD_PRICE_KOBO)
    expect(awardPriceKobo()).toBe(2_000_000)
  })

  it('reads a configured override', () => {
    process.env.AWARD_PRICE_KOBO = '2500000'
    expect(awardPriceKobo()).toBe(2_500_000)
  })

  it('throws on a non-numeric override instead of silently charging the default', () => {
    process.env.AWARD_PRICE_KOBO = 'free'
    expect(() => awardPriceKobo()).toThrow(/positive integer/)
  })

  it('throws on a zero override', () => {
    process.env.AWARD_PRICE_KOBO = '0'
    expect(() => awardPriceKobo()).toThrow(/positive integer/)
  })
})
