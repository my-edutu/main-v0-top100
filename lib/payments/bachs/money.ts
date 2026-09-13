import { awardFee as getAwardFee, formatPaymentFee } from '@/lib/awards/payment-price'
import type { AwardFee, AwardPaymentCurrency } from './types'

export type { AwardFee, AwardPaymentCurrency } from './types'

const DECIMAL_2 = /^(0|[1-9]\d*)\.(\d{2})$/

function assertCurrency(currency: string): asserts currency is AwardPaymentCurrency {
  if (currency !== 'NGN' && currency !== 'USD') {
    throw new Error(`Unsupported Bachs currency: ${currency}`)
  }
}

/** Return the fixed server-owned award fee for NGN or USD. */
export function awardFee(currency: AwardPaymentCurrency): AwardFee {
  return getAwardFee(currency)
}

/** Convert a Bachs major-unit decimal string into exact integer minor units. */
export function parseBachsAmount(value: string, currency: AwardPaymentCurrency): number {
  assertCurrency(currency)
  if (typeof value !== 'string') {
    throw new Error('Bachs amount must be a decimal string with exactly two decimal places.')
  }
  const match = DECIMAL_2.exec(value)
  if (!match) throw new Error('Bachs amount must have exactly two decimal places.')

  const whole = Number(match[1])
  const fraction = Number(match[2])
  const minor = whole * 100 + fraction
  if (!Number.isSafeInteger(minor)) throw new Error('Bachs amount is outside the supported range.')
  return minor
}

/** Render an exact integer minor-unit amount for member-facing display. */
export function formatAwardFee(amountMinor: number, currency: AwardPaymentCurrency): string {
  return formatPaymentFee(amountMinor, currency)
}

export { DECIMAL_2 }
