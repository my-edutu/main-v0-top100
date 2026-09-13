import { describe, expect, it } from 'vitest'

import {
  awardPaymentScreen,
  paymentIsConfirmed,
} from '@/app/dashboard/award-payment-view'
import type { AwardPaymentView } from '@/lib/awards/payment'

const prices = [
  { currency: 'NGN' as const, amountMinor: 2_500_000, display: '₦25,000' },
  { currency: 'USD' as const, amountMinor: 2_000, display: '$20' },
]

function view(overrides: Partial<AwardPaymentView> = {}): AwardPaymentView {
  return {
    status: 'unpaid',
    priceOptions: prices,
    currentAttempt: null,
    confirmedPayment: null,
    needsPayment: true,
    ...overrides,
  }
}

describe('award payment screen selection', () => {
  it('shows loading before the member payment view arrives', () => {
    expect(awardPaymentScreen(null, 'none')).toBe('loading')
  })

  it('starts on the pay panel for an unpaid member', () => {
    expect(awardPaymentScreen(view(), 'none')).toBe('pay')
  })

  it('keeps a Bachs return in confirmation until the server confirms it', () => {
    expect(awardPaymentScreen(view(), 'done')).toBe('confirming')
    expect(
      awardPaymentScreen(view({ status: 'pending' }), 'done'),
    ).toBe('confirming')
  })

  it('never exposes a second checkout while an attempt is open', () => {
    expect(
      awardPaymentScreen(
        view({
          status: 'unpaid',
          currentAttempt: {
            id: 'attempt-1',
            currency: 'NGN',
            amountMinor: 2_500_000,
            status: 'open',
            expiresAt: null,
          },
        }),
        'none',
      ),
    ).toBe('confirming')
  })

  it('shows paid only from confirmed server state', () => {
    const confirmed = view({
      status: 'paid',
      needsPayment: false,
      confirmedPayment: {
        currency: 'USD',
        amountMinor: 2_000,
        paidAt: '2026-09-08T12:00:00.000Z',
      },
    })

    expect(awardPaymentScreen(confirmed, 'done')).toBe('paid')
    expect(paymentIsConfirmed(confirmed)).toBe(true)
  })

  it('restores the pay panel after a cancelled unpaid return', () => {
    expect(awardPaymentScreen(view(), 'cancelled')).toBe('pay')
  })

  it('allows a fresh checkout after a terminal failed attempt', () => {
    expect(
      awardPaymentScreen(
        view({
          status: 'failed',
          currentAttempt: {
            id: 'attempt-failed',
            currency: 'NGN',
            amountMinor: 2_500_000,
            status: 'failed',
            expiresAt: null,
          },
        }),
        'none',
      ),
    ).toBe('pay')
  })

  it('keeps reconciliation states away from a new checkout', () => {
    expect(
      awardPaymentScreen(view({ status: 'refunded', needsPayment: true }), 'none'),
    ).toBe('confirming')
  })
})
