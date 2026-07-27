// lib/awards/quote.ts
// Shipping quotes go stale. A member must not be able to sit on a cheap quote
// and pay it weeks later, so every quote carries an expiry that checkout
// re-checks before charging.

export const QUOTE_TTL_MS = 24 * 60 * 60 * 1000

export function quoteExpiresAt(now: number = Date.now()): string {
  return new Date(now + QUOTE_TTL_MS).toISOString()
}

/** Missing or unparseable expiries count as expired — fail closed. */
export function isQuoteExpired(expiresAt: string | null, now: number = Date.now()): boolean {
  if (!expiresAt) return true
  const timestamp = Date.parse(expiresAt)
  if (Number.isNaN(timestamp)) return true
  return timestamp <= now
}
