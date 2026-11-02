import type { AwardPaymentCurrency, AwardPaymentView } from './payment'

type PaymentOrder = {
  status?: string
  award_payment_status?: AwardPaymentView['status']
  award_paid_attempt_id?: string | null
  award_paid_at?: string | null
  award_amount_kobo?: number
  paid_at?: string | null
  paystack_reference?: string | null
  paystack_status?: string | null
}
export type PaymentAttemptRow = {
  id: string
  provider?: string | null
  charge_scope?: string | null
  status: string
  currency?: string
  requested_amount_minor?: number | string
  captured_amount_minor?: number | string | null
  checkout_expires_at?: string | null
  confirmed_at?: string | null
}
const LEGACY_PAID = ['paid', 'dispatched', 'in_transit', 'delivered']
const PAYSTACK_SUCCESS_STATUSES = new Set([
  'paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted',
])
const LEGACY_TERMINAL_FAILURES = new Set([
  'failed',
  'expired',
  'cancelled',
  'abandoned',
  'reversed',
])

export function parseCheckoutCurrency(body: unknown): AwardPaymentCurrency {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Select NGN or USD.')
  const record = body as Record<string, unknown>
  if (Object.keys(record).length !== 1 || (record.currency !== 'NGN' && record.currency !== 'USD')) {
    throw new Error('Send only a supported currency (NGN or USD).')
  }
  return record.currency as AwardPaymentCurrency
}

function validTimestamp(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || !value.trim() || !Number.isFinite(Date.parse(value))) return null
  return value
}

function validExactAmount(attempt: PaymentAttemptRow): boolean {
  const requested = Number(attempt.requested_amount_minor)
  const captured = Number(attempt.captured_amount_minor)
  return Number.isSafeInteger(requested) && requested > 0 && Number.isSafeInteger(captured) && captured === requested
}

function isCanonicalAwardSuccess(order: PaymentOrder | null, attempts: PaymentAttemptRow[]) {
  const attemptId = order?.award_paid_attempt_id
  if (!attemptId) return null
  const attempt = attempts.find(candidate => candidate.id === attemptId)
  if (!attempt || attempt.provider?.trim().toLowerCase() !== 'bachs' || attempt.charge_scope?.trim().toLowerCase() !== 'award_fee' || attempt.status.trim().toLowerCase() !== 'succeeded' || !validTimestamp(attempt.confirmed_at) || !validExactAmount(attempt)) return null
  if (attempt.currency !== 'NGN' && attempt.currency !== 'USD') return null
  return attempt
}

export function mapPaymentView(
  order: PaymentOrder | null,
  attempts: PaymentAttemptRow[],
  priceOptions: AwardPaymentView['priceOptions'],
): AwardPaymentView {
  const summaryStatus = order?.award_payment_status
  const canonicalPaid = isCanonicalAwardSuccess(order, attempts)
  const legacyReference = order?.paystack_reference?.trim() ?? ''
  const legacyProviderStatus = order?.paystack_status?.trim().toLowerCase() ?? ''
  const legacyPaid = Boolean(
    legacyReference &&
      order?.status !== 'cancelled' &&
      validTimestamp(order?.paid_at) &&
      PAYSTACK_SUCCESS_STATUSES.has(legacyProviderStatus),
  )
  const legacyFailed = Boolean(
    legacyReference && LEGACY_TERMINAL_FAILURES.has(legacyProviderStatus),
  )
  const legacyPending = Boolean(
    legacyReference &&
      order?.status !== 'cancelled' &&
      !legacyPaid &&
      !legacyFailed,
  )
  const suspiciousPaidFlag = LEGACY_PAID.includes(order?.status ?? '') || summaryStatus === 'paid'
  const status = summaryStatus === 'refunded'
    ? 'refunded'
    : canonicalPaid || legacyPaid
      ? 'paid'
      : summaryStatus === 'failed' || legacyFailed
        ? 'failed'
        : summaryStatus === 'pending' || legacyPending || suspiciousPaidFlag
          ? 'pending'
          : summaryStatus ?? 'unpaid'
  const latest = attempts[0]
  const confirmedPayment: AwardPaymentView['confirmedPayment'] = status !== 'paid' ? null : canonicalPaid ? {
    currency: canonicalPaid.currency as AwardPaymentCurrency,
    amountMinor: Number(canonicalPaid.captured_amount_minor),
    paidAt: validTimestamp(canonicalPaid.confirmed_at) ?? '',
  } : legacyPaid ? {
    currency: 'NGN', amountMinor: order?.award_amount_kobo ?? 0,
    paidAt: validTimestamp(order?.paid_at) ?? validTimestamp(order?.award_paid_at) ?? '',
  } : null
  return {
    status, priceOptions, confirmedPayment, needsPayment: status !== 'paid',
    currentAttempt: status === 'paid' || !latest ? null : {
      id: latest.id, currency: latest.currency as AwardPaymentCurrency,
      amountMinor: Number(latest.requested_amount_minor), status: latest.status,
      expiresAt: latest.checkout_expires_at ?? null,
    },
  }
}
