import { describe, it, expect } from 'vitest'
import { QUOTE_TTL_MS, isQuoteExpired, quoteExpiresAt } from '@/lib/awards/quote'

const NOW = Date.parse('2026-07-26T12:00:00.000Z')

describe('QUOTE_TTL_MS', () => {
  it('is 24 hours', () => {
    expect(QUOTE_TTL_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('quoteExpiresAt', () => {
  it('returns an ISO timestamp one TTL in the future', () => {
    expect(quoteExpiresAt(NOW)).toBe('2026-07-27T12:00:00.000Z')
  })
})

describe('isQuoteExpired', () => {
  it('treats a missing expiry as expired', () => {
    expect(isQuoteExpired(null, NOW)).toBe(true)
  })

  it('treats an unparseable expiry as expired', () => {
    expect(isQuoteExpired('not-a-date', NOW)).toBe(true)
  })

  it('is false for a future expiry', () => {
    expect(isQuoteExpired('2026-07-27T00:00:00.000Z', NOW)).toBe(false)
  })

  it('is true for a past expiry', () => {
    expect(isQuoteExpired('2026-07-25T12:00:00.000Z', NOW)).toBe(true)
  })

  it('is true exactly at the expiry instant', () => {
    expect(isQuoteExpired('2026-07-26T12:00:00.000Z', NOW)).toBe(true)
  })

  it('round-trips with quoteExpiresAt', () => {
    const expiry = quoteExpiresAt(NOW)
    expect(isQuoteExpired(expiry, NOW)).toBe(false)
    expect(isQuoteExpired(expiry, NOW + QUOTE_TTL_MS + 1)).toBe(true)
  })
})
