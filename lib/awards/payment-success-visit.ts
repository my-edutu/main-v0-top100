import type { AwardPaymentView } from './payment'

type ConfirmedPayment = NonNullable<AwardPaymentView['confirmedPayment']>
type PaymentSuccessStorage = Pick<Storage, 'getItem' | 'setItem'>

export function claimAwardPaymentSuccess(
  storage: PaymentSuccessStorage,
  payment: ConfirmedPayment,
) {
  const key = [
    'top100',
    'award-payment-success',
    payment.currency,
    payment.amountMinor,
    payment.paidAt,
  ].join(':')

  if (storage.getItem(key)) return false

  storage.setItem(key, 'shown')
  return true
}
