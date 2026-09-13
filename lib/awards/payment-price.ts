import type { AwardFee, AwardPaymentCurrency } from '@/lib/payments/bachs/types'

export type { AwardFee, AwardPaymentCurrency } from '@/lib/payments/bachs/types'

export const DEFAULT_AWARD_FEE_NGN_MINOR = 2_500_000
export const DEFAULT_AWARD_FEE_USD_MINOR = 2_000
export const DEFAULT_AWARD_PRICE_VERSION = 'afl-award-2026-v1'

type Environment = Record<string, string | undefined>

function assertCurrency(currency: string): asserts currency is AwardPaymentCurrency {
  if (currency !== 'NGN' && currency !== 'USD') {
    throw new Error(`Unsupported award payment currency: ${currency}`)
  }
}

function configuredMinor(name: string, fallback: number, env: Environment): number {
  const raw = env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  if (!/^\d+$/.test(raw.trim())) {
    throw new Error(`${name} must be a positive safe integer minor-unit amount.`)
  }
  const value = Number(raw.trim())
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive safe integer minor-unit amount.`)
  }
  if (value !== fallback) {
    throw new Error(`${name} is fixed at ${fallback} minor units for the active award price contract.`)
  }
  return value
}

function amountString(amountMinor: number): string {
  const whole = Math.floor(amountMinor / 100)
  const fraction = String(amountMinor % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}

function displayAmount(amountMinor: number, currency: AwardPaymentCurrency): string {
  const whole = Math.floor(amountMinor / 100)
  const fraction = amountMinor % 100
  const locale = currency === 'NGN' ? 'en-NG' : 'en-US'
  const symbol = currency === 'NGN' ? '₦' : '$'
  const formattedWhole = whole.toLocaleString(locale)
  return fraction === 0
    ? `${symbol}${formattedWhole}`
    : `${symbol}${formattedWhole}.${String(fraction).padStart(2, '0')}`
}

/** Return the server-owned, versioned price for one supported award currency. */
export function awardFee(
  currency: AwardPaymentCurrency,
  env: Environment = process.env,
): AwardFee {
  assertCurrency(currency)
  const amountMinor = configuredMinor(
    currency === 'NGN' ? 'AWARD_FEE_NGN_MINOR' : 'AWARD_FEE_USD_MINOR',
    currency === 'NGN' ? DEFAULT_AWARD_FEE_NGN_MINOR : DEFAULT_AWARD_FEE_USD_MINOR,
    env,
  )
  const priceVersion = (env.AWARD_PRICE_VERSION ?? DEFAULT_AWARD_PRICE_VERSION).trim()
  if (!priceVersion || priceVersion.length > 100) {
    throw new Error('AWARD_PRICE_VERSION must be a non-empty version string.')
  }

  return {
    currency,
    amountMinor,
    bachsAmount: amountString(amountMinor),
    display: displayAmount(amountMinor, currency),
    priceVersion,
  }
}

export function formatPaymentFee(amountMinor: number, currency: AwardPaymentCurrency): string {
  assertCurrency(currency)
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error('Award payment amount must be a non-negative safe integer minor-unit amount.')
  }
  return displayAmount(amountMinor, currency)
}

export const formatAwardFee = formatPaymentFee
