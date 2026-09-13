import type { AwardPaymentView } from '@/lib/awards/payment'

export type AwardPaymentReturnState = 'none' | 'done' | 'cancelled'

export type AwardPaymentScreen = 'loading' | 'pay' | 'confirming' | 'paid'

const RETRYABLE_ATTEMPT_STATUSES = new Set([
  'failed',
  'expired',
  'cancelled',
])
const SUPPORT_ONLY_STATES = new Set(['refunded', 'underpaid', 'overpaid', 'exception'])

/**
 * Select the member-facing panel from server-owned payment state.
 *
 * A redirect only starts confirmation. It never turns into `paid` until the
 * API returns a confirmed payment, and an open attempt never exposes a second
 * checkout action.
 */
export function awardPaymentScreen(
  view: AwardPaymentView | null,
  returnState: AwardPaymentReturnState,
): AwardPaymentScreen {
  if (!view) return 'loading'

  const status = view.status

  if (status === 'paid' || view.confirmedPayment) return 'paid'

  if (SUPPORT_ONLY_STATES.has(status)) return 'confirming'

  if (
    view.currentAttempt &&
    RETRYABLE_ATTEMPT_STATUSES.has(view.currentAttempt.status) &&
    (status === 'unpaid' || status === 'failed')
  ) {
    return 'pay'
  }

  if (status === 'pending') return 'confirming'

  if (
    view.currentAttempt !== null &&
    !RETRYABLE_ATTEMPT_STATUSES.has(view.currentAttempt.status)
  ) {
    return 'confirming'
  }

  if (
    returnState === 'done' &&
    view.needsPayment &&
    status === 'unpaid'
  ) {
    return 'confirming'
  }

  return 'pay'
}

export function paymentIsConfirmed(view: AwardPaymentView | null) {
  return Boolean(view && (view.status === 'paid' || view.confirmedPayment))
}
