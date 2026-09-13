/**
 * Safe, provider-neutral payment projection for the admin award console.
 * Provider payloads and webhook bodies stay in the restricted payment ledger.
 */
export type AdminPaymentAttemptView = {
  id: string | null
  provider: string
  providerLabel: string
  chargeScope: string | null
  status: string
  priceVersion: string | null
  requestedAmountMinor: number | null
  selectedAmountMinor: number | null
  capturedAmountMinor: number | null
  currency: string | null
  providerReference: string | null
  reference: string | null
  providerCheckoutId: string | null
  checkoutId: string | null
  providerChargeId: string | null
  providerStatus: string | null
  paidAt: string | null
  failureReason: string | null
  exceptionStatus: string | null
  isLegacy: boolean
}

const PAYMENT_EXCEPTION_STATUSES = new Set(['underpaid', 'overpaid', 'duplicate_succeeded', 'exception'])

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function minorUnits(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function paymentLabel(provider: string): string {
  if (provider === 'paystack') return 'Paystack (legacy)'
  if (provider === 'bachs') return 'Bachs'
  return provider ? provider[0].toUpperCase() + provider.slice(1) : 'Unknown provider'
}

/** Map a payment-attempt row to the safe fields exposed to administrators. */
export function mapAdminPaymentAttempt(row: any): AdminPaymentAttemptView {
  const provider = nullableString(row?.provider)?.toLowerCase() ?? 'unknown'
  const status = nullableString(row?.status)?.toLowerCase() ?? 'unknown'
  const exceptionStatus = PAYMENT_EXCEPTION_STATUSES.has(status) ? status : null

  const requestedAmountMinor = minorUnits(row?.requested_amount_minor)
  const providerReference = nullableString(row?.provider_reference)
  const providerCheckoutId = nullableString(row?.provider_checkout_id)

  return {
    id: nullableString(row?.id),
    provider,
    providerLabel: paymentLabel(provider),
    chargeScope: nullableString(row?.charge_scope),
    status,
    priceVersion: nullableString(row?.price_version),
    requestedAmountMinor,
    selectedAmountMinor: requestedAmountMinor,
    capturedAmountMinor: minorUnits(row?.captured_amount_minor),
    currency: nullableString(row?.currency)?.toUpperCase() ?? null,
    providerReference,
    reference: providerReference,
    providerCheckoutId,
    checkoutId: providerCheckoutId,
    providerChargeId: nullableString(row?.provider_charge_id),
    providerStatus: nullableString(row?.provider_status),
    paidAt: nullableString(row?.confirmed_at),
    failureReason: nullableString(row?.failure_reason),
    exceptionStatus,
    isLegacy: provider === 'paystack',
  }
}

/** A safe projection for a historical Paystack reference when backfill is not available yet. */
export function mapLegacyPaystackPayment(order: any): AdminPaymentAttemptView | null {
  const reference = nullableString(order?.paystack_reference)
  if (!reference) return null

  const status = nullableString(order?.paystack_status) ?? (order?.paid_at ? 'succeeded' : 'legacy')
  const requestedAmountMinor = minorUnits(order?.total_amount_kobo)
  return {
    id: null,
    provider: 'paystack',
    providerLabel: 'Paystack (legacy)',
    chargeScope: 'legacy_award_plus_delivery',
    status,
    priceVersion: null,
    requestedAmountMinor,
    selectedAmountMinor: requestedAmountMinor,
    capturedAmountMinor: order?.paid_at ? requestedAmountMinor : null,
    currency: nullableString(order?.currency)?.toUpperCase() ?? 'NGN',
    providerReference: reference,
    reference,
    providerCheckoutId: null,
    checkoutId: null,
    providerChargeId: null,
    providerStatus: nullableString(order?.paystack_status),
    paidAt: nullableString(order?.paid_at),
    failureReason: null,
    exceptionStatus: null,
    isLegacy: true,
  }
}

/**
 * Prefer the explicitly claimed paid attempt, then the newest successful/current
 * attempt, while retaining a legacy Paystack projection for old orders.
 */
export function selectAdminPaymentAttempt(order: any, rows: any[] = []): AdminPaymentAttemptView | null {
  const claimedId = nullableString(order?.award_paid_attempt_id)
  const claimed = claimedId ? rows.find((row) => row?.id === claimedId) : null
  if (claimed) return mapAdminPaymentAttempt(claimed)

  const ranked = [...rows].sort((left, right) => {
    const leftStatus = nullableString(left?.status)?.toLowerCase()
    const rightStatus = nullableString(right?.status)?.toLowerCase()
    const leftSuccess = leftStatus === 'succeeded' ? 1 : 0
    const rightSuccess = rightStatus === 'succeeded' ? 1 : 0
    if (leftSuccess !== rightSuccess) return rightSuccess - leftSuccess
    const leftCreated = Date.parse(nullableString(left?.created_at) ?? '') || 0
    const rightCreated = Date.parse(nullableString(right?.created_at) ?? '') || 0
    return rightCreated - leftCreated
  })
  if (ranked[0]) return mapAdminPaymentAttempt(ranked[0])
  return mapLegacyPaystackPayment(order)
}
