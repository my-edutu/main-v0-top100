import { describe, expect, it } from 'vitest'

import { magazinePaymentScreen } from '@/lib/magazine/payment-flow'

describe('magazine payment confirmation flow', () => {
  it('asks the member to acknowledge a confirmed payment before opening the application', () => {
    expect(magazinePaymentScreen({ loading: false, paymentConfirmed: true, returnedFromPayment: true, confirmationAccepted: false })).toBe('confirmation')
  })

  it('opens the application after the member acknowledges payment confirmation', () => {
    expect(magazinePaymentScreen({ loading: false, paymentConfirmed: true, returnedFromPayment: true, confirmationAccepted: true })).toBe('application')
  })

  it('does not mistake an unconfirmed return for a successful payment', () => {
    expect(magazinePaymentScreen({ loading: false, paymentConfirmed: false, returnedFromPayment: true, confirmationAccepted: false })).toBe('payment')
  })

  it('keeps the application available for an already confirmed payment on a later visit', () => {
    expect(magazinePaymentScreen({ loading: false, paymentConfirmed: true, returnedFromPayment: false, confirmationAccepted: false })).toBe('application')
  })

  it('keeps the loading state ahead of all payment content', () => {
    expect(magazinePaymentScreen({ loading: true, paymentConfirmed: true, returnedFromPayment: true, confirmationAccepted: false })).toBe('loading')
  })
})
