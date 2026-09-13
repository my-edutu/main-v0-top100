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
  status: string
  currency?: string
  requested_amount_minor?: number
  captured_amount_minor?: number | null
  checkout_expires_at?: string | null
  confirmed_at?: string | null
}
const LEGACY_PAID = ['paid', 'dispatched', 'in_transit', 'delivered']
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

export function mapPaymentView(
  order: PaymentOrder | null,
  attempts: PaymentAttemptRow[],
  priceOptions: AwardPaymentView['priceOptions'],
): AwardPaymentView {
  const summaryStatus = order?.award_payment_status
  const legacyPaid = LEGACY_PAID.includes(order?.status ?? '')
  const legacyProviderStatus = order?.paystack_status?.trim().toLowerCase() ?? ''
  const legacyFailed = Boolean(
    order?.paystack_reference && LEGACY_TERMINAL_FAILURES.has(legacyProviderStatus),
  )
  const legacyPending = Boolean(
    order?.paystack_reference &&
      order.status !== 'cancelled' &&
      !legacyPaid &&
      !legacyFailed &&
      (!summaryStatus || summaryStatus === 'unpaid'),
  )
  const status = summaryStatus === 'refunded'
    ? 'refunded'
    : summaryStatus === 'paid'
      ? 'paid'
      : summaryStatus === 'pending'
        ? 'pending'
        : summaryStatus === 'failed'
          ? 'failed'
          : legacyPaid
            ? 'paid'
            : legacyFailed
              ? 'failed'
              : legacyPending
                ? 'pending'
                : summaryStatus ?? 'unpaid'
  const paid = attempts.find(a => a.id === order?.award_paid_attempt_id)
    ?? attempts.find(a => a.status === 'succeeded')
  const latest = attempts[0]
  const confirmedPayment: AwardPaymentView['confirmedPayment'] = status !== 'paid' ? null : paid ? {
    currency: paid.currency as AwardPaymentCurrency,
    amountMinor: Number(paid.captured_amount_minor ?? paid.requested_amount_minor),
    paidAt: paid.confirmed_at ?? order?.award_paid_at ?? order?.paid_at ?? '',
  } : legacyPaid ? {
    currency: 'NGN', amountMinor: order?.award_amount_kobo ?? 0,
    paidAt: order?.award_paid_at ?? order?.paid_at ?? '',
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
