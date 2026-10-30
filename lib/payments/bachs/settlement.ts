import { parseBachsAmount } from './money'

type AwardEvidence = {
  checkoutId: string
  reference: string
  chargeId: string | null
  orderId: string
  attemptId: string
  currency: 'NGN' | 'USD'
  requestedMinor: number
  grossMinor: number
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

type CheckoutEvidence = Omit<AwardEvidence, 'chargeId' | 'grossMinor'>
export type VerifiedAwardCheckout = {
  status: 'paid' | 'expired' | 'open'
  currency: 'NGN' | 'USD'
  amountMinor: number
  chargeId: string | null
  chargeCurrency: string | null
  grossAmount: string | null
  checkoutUrl: string | null
  expiresAt: string | null
}

function decimalMinor(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) return null
  return BigInt(value.replace('.', ''))
}

/** Verify the original checkout contract, separately from the local charge currency. */
export async function verifyBachsAwardCheckout(
  evidence: CheckoutEvidence,
  config: { apiBaseUrl: string; apiKey: string },
  fetcher: typeof fetch = fetch,
): Promise<VerifiedAwardCheckout | null> {
  const response = await fetcher(`${config.apiBaseUrl}/v1/checkout-sessions/${encodeURIComponent(evidence.checkoutId)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}`, Accept: 'application/json' },
    cache: 'no-store', signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`Bachs checkout verification failed (${response.status}).`)
  const checkout = record(await response.json())
  const metadata = record(checkout.metadata)
  if (checkout.checkout_id !== evidence.checkoutId || checkout.reference !== evidence.reference ||
      metadata.order_id !== evidence.orderId || metadata.payment_attempt_id !== evidence.attemptId ||
      metadata.purpose !== 'afl_award_fee_v1' || checkout.currency !== evidence.currency) return null
  try {
    if (typeof checkout.amount !== 'string' || parseBachsAmount(checkout.amount, evidence.currency) !== evidence.requestedMinor) return null
  } catch { return null }

  const charge = record(checkout.charge)
  const base = {
    currency: evidence.currency, amountMinor: evidence.requestedMinor,
    chargeId: typeof charge.payment_id === 'string' ? charge.payment_id : null,
    chargeCurrency: typeof charge.currency === 'string' ? charge.currency : null,
    grossAmount: typeof charge.amount_paid === 'string' ? charge.amount_paid : null,
    checkoutUrl: typeof checkout.checkout_url === 'string' ? checkout.checkout_url : null,
    expiresAt: typeof checkout.expires_at === 'string' ? checkout.expires_at : null,
  }
  if (checkout.status === 'expired' &&
      ['requires_payment_method', 'unpaid', 'failed', 'expired'].includes(String(checkout.payment_status)) &&
      (!checkout.charge || ['incomplete', 'failed', 'cancelled', 'expired'].includes(String(charge.status)))) {
    return { ...base, status: 'expired' }
  }
  if (checkout.status === 'open' && checkout.payment_status === 'requires_payment_method' && !checkout.charge) {
    return { ...base, status: 'open' }
  }
  if (checkout.status !== 'completed' || checkout.payment_status !== 'succeeded' || !['succeeded', 'accepted'].includes(String(charge.status)) ||
      charge.checkout_id !== evidence.checkoutId || charge.reference !== evidence.reference || !base.chargeId ||
      (charge.refunds != null && (!Array.isArray(charge.refunds) || charge.refunds.length > 0))) return null

  const fees = record(charge.fees)
  const gross = decimalMinor(charge.amount_paid)
  const fee = charge.fees == null ? BigInt(0) : decimalMinor(fees.amount)
  if (!base.chargeCurrency || !/^[A-Z]{3}$/.test(base.chargeCurrency) || gross === null || gross <= BigInt(0) ||
      fee === null || fee < BigInt(0) || fee >= gross || (charge.fees != null && fees.currency !== base.chargeCurrency)) return null
  // No FX conversion is calculated by the app. Bachs' authenticated paid session
  // binds the local charge to the exact original price. For same-currency charges,
  // also require that the provider fee explains the entire excess.
  if (base.chargeCurrency === evidence.currency && gross - fee !== BigInt(evidence.requestedMinor)) {
    // Bachs includes merchant card costs in fees.amount. Only the customer
    // processing component explains the difference between gross and price.
    const breakdown = Array.isArray(fees.breakdown) ? fees.breakdown.map(record) : []
    const processing = breakdown.filter(item => item.type === 'processing')
    const customerFee = processing.length === 1 ? decimalMinor(processing[0].amount) : null
    if (charge.merchant_bears_cost !== false || customerFee === null || customerFee < BigInt(0) ||
        customerFee > fee || gross - customerFee !== BigInt(evidence.requestedMinor)) return null
  }
  return { ...base, status: 'paid' }
}

/** Only remove a provider fee when authenticated checkout evidence explains the exact excess. */
export async function verifiedBachsAwardAmount(
  evidence: AwardEvidence,
  config: { apiBaseUrl: string; apiKey: string },
  fetcher: typeof fetch = fetch,
): Promise<number | null> {
  const verified = await verifyBachsAwardCheckout(evidence, config, fetcher)
  if (!verified || verified.status !== 'paid' || verified.chargeCurrency !== evidence.currency ||
      (evidence.chargeId && verified.chargeId !== evidence.chargeId) ||
      decimalMinor(verified.grossAmount) !== BigInt(evidence.grossMinor)) return null
  return verified.amountMinor
}
