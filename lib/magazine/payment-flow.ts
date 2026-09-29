export type MagazinePaymentScreen = 'loading' | 'payment' | 'confirmation' | 'application'

export function magazinePaymentScreen(input: {
  loading: boolean
  paymentConfirmed: boolean
  returnedFromPayment: boolean
  confirmationAccepted: boolean
}): MagazinePaymentScreen {
  if (input.loading) return 'loading'
  if (!input.paymentConfirmed) return 'payment'
  if (input.returnedFromPayment && !input.confirmationAccepted) return 'confirmation'
  return 'application'
}
