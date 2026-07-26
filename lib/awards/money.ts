// lib/awards/money.ts
// Money for the award flow. Every amount in this system is an integer number
// of kobo — floats are never allowed near a charge, because 0.1 + 0.2 problems
// on real money are unacceptable.

export const KOBO_PER_NAIRA = 100

/** ₦20,000, the standing Africa Future Leaders award price. */
export const DEFAULT_AWARD_PRICE_KOBO = 2_000_000

/** Throw unless `value` is a valid kobo amount (non-negative integer). */
export function assertKobo(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer number of kobo, received: ${value}`)
  }
}

/**
 * The award price, overridable via AWARD_PRICE_KOBO so the price can change
 * without a code change. A malformed override throws rather than silently
 * falling back — quietly charging a different price than configured would be
 * worse than a loud failure.
 */
export function awardPriceKobo(): number {
  const raw = process.env.AWARD_PRICE_KOBO
  if (raw === undefined || raw === '') return DEFAULT_AWARD_PRICE_KOBO

  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`AWARD_PRICE_KOBO must be a positive integer number of kobo, received: ${raw}`)
  }
  return parsed
}

/** Award price + shipping. Both operands are validated first. */
export function totalKobo(awardKobo: number, shippingKobo: number): number {
  assertKobo(awardKobo, 'award amount')
  assertKobo(shippingKobo, 'shipping amount')
  return awardKobo + shippingKobo
}

/** Render kobo as naira for display: 2_000_000 -> "₦20,000". */
export function formatNaira(kobo: number): string {
  assertKobo(kobo, 'amount')
  const naira = Math.floor(kobo / KOBO_PER_NAIRA)
  const remainder = kobo % KOBO_PER_NAIRA
  const body = naira.toLocaleString('en-NG')
  return remainder === 0 ? `₦${body}` : `₦${body}.${String(remainder).padStart(2, '0')}`
}
