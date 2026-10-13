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

/** Only remove a provider fee when authenticated checkout evidence explains the exact excess. */
export async function verifiedBachsAwardAmount(
  evidence: AwardEvidence,
  config: { apiBaseUrl: string; apiKey: string },
  fetcher: typeof fetch = fetch,
): Promise<number | null> {
  const response = await fetcher(`${config.apiBaseUrl}/v1/checkout-sessions/${encodeURIComponent(evidence.checkoutId)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}`, Accept: 'application/json' },
    cache: 'no-store', signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`Bachs settlement verification failed (${response.status}).`)
  const checkout = record(await response.json())
  const charge = record(checkout.charge)
  const fees = record(charge.fees)
  const metadata = record(checkout.metadata)
  if (checkout.checkout_id !== evidence.checkoutId || checkout.reference !== evidence.reference ||
      checkout.status !== 'completed' || checkout.payment_status !== 'succeeded' ||
      charge.status !== 'succeeded' || charge.checkout_id !== evidence.checkoutId ||
      charge.reference !== evidence.reference || typeof charge.payment_id !== 'string' ||
      (evidence.chargeId && charge.payment_id !== evidence.chargeId) ||
      metadata.order_id !== evidence.orderId || metadata.payment_attempt_id !== evidence.attemptId ||
      metadata.purpose !== 'afl_award_fee_v1' || checkout.currency !== evidence.currency ||
      charge.currency !== evidence.currency || fees.currency !== evidence.currency ||
      (charge.refunds != null && (!Array.isArray(charge.refunds) || charge.refunds.length > 0))) return null

  try {
    if (typeof checkout.amount !== 'string' || typeof charge.amount_paid !== 'string' || typeof fees.amount !== 'string') return null
    const principal = parseBachsAmount(checkout.amount, evidence.currency)
    const gross = parseBachsAmount(charge.amount_paid, evidence.currency)
    const fee = parseBachsAmount(fees.amount, evidence.currency)
    return principal === evidence.requestedMinor && gross === evidence.grossMinor && fee > 0 && gross - fee === principal
      ? principal : null
  } catch {
    return null
  }
}
