type PaymentEvidence = {
  id?: string | null
  provider?: string | null
  chargeScope?: string | null
  status?: string | null
  exceptionStatus?: string | null
  failureReason?: string | null
  paidAt?: string | null
  providerReference?: string | null
  isLegacy?: boolean
}

export type AdminAwardSummaryOrder = {
  status?: string | null
  waybill?: string | null
  awardPaymentStatus?: string | null
  awardPaidAttemptId?: string | null
  awardPaymentVerified?: boolean
  payment?: PaymentEvidence | null
  paymentAttempts?: PaymentEvidence[]
}

export type AdminAwardSummary = {
  totalOrders: number
  paymentDataAvailable: boolean
  confirmedPayments: number | null
  dispatchNeeded: number | null
  paymentExceptions: number | null
  quoteFailures: number
  inDelivery: number
}

const PAYSTACK_SUCCESS_STATUSES = new Set([
  'paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted',
])

const PAYMENT_EXCEPTION_STATUSES = new Set(['underpaid', 'overpaid', 'duplicate_succeeded', 'exception'])

/** Payment truth comes from the canonical successful Bachs attempt or verified legacy Paystack evidence. */
export function hasVerifiedAwardPayment(order: AdminAwardSummaryOrder): boolean {
  if (order.awardPaymentStatus !== 'paid') return false

  const attempts = order.paymentAttempts?.length
    ? order.paymentAttempts
    : order.payment ? [order.payment] : []
  const canonicalAttemptId = order.awardPaidAttemptId
  if (canonicalAttemptId && attempts.some((attempt) =>
    attempt.id === canonicalAttemptId &&
    attempt.provider === 'bachs' &&
    attempt.chargeScope === 'award_fee' &&
    attempt.status === 'succeeded' &&
    Boolean(attempt.paidAt),
  )) return true

  return attempts.some((attempt) =>
    attempt.provider === 'paystack' &&
    attempt.isLegacy === true &&
    PAYSTACK_SUCCESS_STATUSES.has(attempt.status?.toLowerCase() ?? '') &&
    Boolean(attempt.paidAt) &&
    Boolean(attempt.providerReference),
  )
}

export function hasPaymentException(order: AdminAwardSummaryOrder): boolean {
  return (order.paymentAttempts?.length
    ? order.paymentAttempts
    : order.payment ? [order.payment] : [])
    .some((attempt) => Boolean(
      attempt.exceptionStatus ||
      attempt.failureReason ||
      PAYMENT_EXCEPTION_STATUSES.has(attempt.status?.toLowerCase() ?? ''),
    ))
}

export function buildAdminAwardSummary(orders: AdminAwardSummaryOrder[], paymentDataAvailable = true): AdminAwardSummary {
  if (!paymentDataAvailable) {
    return {
      totalOrders: orders.length,
      paymentDataAvailable: false,
      confirmedPayments: null,
      dispatchNeeded: null,
      paymentExceptions: null,
      quoteFailures: orders.filter((order) => order.status === 'quote_failed').length,
      inDelivery: orders.filter((order) => ['dispatched', 'in_transit', 'delivered'].includes(order.status ?? '')).length,
    }
  }

  return orders.reduce<AdminAwardSummary>((summary, order) => {
    const paymentVerified = order.awardPaymentVerified ?? hasVerifiedAwardPayment(order)
    summary.totalOrders += 1
    if (paymentVerified) summary.confirmedPayments = (summary.confirmedPayments ?? 0) + 1
    if (paymentVerified && order.status === 'paid' && !order.waybill) summary.dispatchNeeded = (summary.dispatchNeeded ?? 0) + 1
    if (hasPaymentException(order)) summary.paymentExceptions = (summary.paymentExceptions ?? 0) + 1
    if (order.status === 'quote_failed') summary.quoteFailures += 1
    if (['dispatched', 'in_transit', 'delivered'].includes(order.status ?? '')) summary.inDelivery += 1
    return summary
  }, {
    totalOrders: 0,
    paymentDataAvailable: true,
    confirmedPayments: 0,
    dispatchNeeded: 0,
    paymentExceptions: 0,
    quoteFailures: 0,
    inDelivery: 0,
  })
}
