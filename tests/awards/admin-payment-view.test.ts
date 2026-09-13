import { describe, expect, it } from 'vitest'

import {
  mapAdminPaymentAttempt,
  mapLegacyPaystackPayment,
  selectAdminPaymentAttempt,
} from '@/lib/awards/admin-payment-view'

describe('admin award payment projection', () => {
  it('exposes provider-neutral payment evidence without provider payloads', () => {
    const view = mapAdminPaymentAttempt({
      id: 'attempt-1',
      provider: 'bachs',
      charge_scope: 'award_fee',
      status: 'underpaid',
      price_version: 'afl-award-2026-v1',
      requested_amount_minor: '2500000',
      captured_amount_minor: 2400000,
      currency: 'NGN',
      provider_reference: 'AFL-AWARD-order-1-attempt-1',
      provider_checkout_id: 'chk_1',
      provider_charge_id: 'ch_1',
      provider_status: 'succeeded',
      confirmed_at: '2026-09-08T10:00:00.000Z',
      failure_reason: 'Captured amount was below the server-owned award fee.',
      provider_response: { secret: 'must not escape' },
      payload: { customer: 'private' },
    })

    expect(view).toMatchObject({
      provider: 'bachs',
      providerLabel: 'Bachs',
      chargeScope: 'award_fee',
      status: 'underpaid',
      requestedAmountMinor: 2_500_000,
      selectedAmountMinor: 2_500_000,
      capturedAmountMinor: 2_400_000,
      currency: 'NGN',
      providerReference: 'AFL-AWARD-order-1-attempt-1',
      reference: 'AFL-AWARD-order-1-attempt-1',
      providerCheckoutId: 'chk_1',
      checkoutId: 'chk_1',
      exceptionStatus: 'underpaid',
      paidAt: '2026-09-08T10:00:00.000Z',
      isLegacy: false,
    })
    expect(view).not.toHaveProperty('providerResponse')
    expect(view).not.toHaveProperty('payload')
  })

  it('labels historical Paystack rows as legacy and preserves the old scope', () => {
    const view = mapLegacyPaystackPayment({
      paystack_reference: 'AFL-AWARD-order-1-old',
      paystack_status: 'success',
      total_amount_kobo: 2_850_000,
      currency: 'NGN',
      paid_at: '2026-08-01T09:00:00.000Z',
    })

    expect(view).toMatchObject({
      provider: 'paystack',
      providerLabel: 'Paystack (legacy)',
      chargeScope: 'legacy_award_plus_delivery',
      providerReference: 'AFL-AWARD-order-1-old',
      requestedAmountMinor: 2_850_000,
      capturedAmountMinor: 2_850_000,
      isLegacy: true,
    })
  })

  it('prefers the order claim over a newer duplicate success', () => {
    const payment = selectAdminPaymentAttempt(
      { award_paid_attempt_id: 'attempt-1' },
      [
        {
          id: 'attempt-2',
          provider: 'bachs',
          status: 'duplicate_succeeded',
          requested_amount_minor: 2_500_000,
          currency: 'NGN',
          provider_reference: 'ref-2',
          created_at: '2026-09-08T12:00:00.000Z',
        },
        {
          id: 'attempt-1',
          provider: 'bachs',
          status: 'succeeded',
          requested_amount_minor: 2_500_000,
          captured_amount_minor: 2_500_000,
          currency: 'NGN',
          provider_reference: 'ref-1',
          created_at: '2026-09-08T11:00:00.000Z',
        },
      ],
    )

    expect(payment).toMatchObject({ id: 'attempt-1', status: 'succeeded', providerReference: 'ref-1' })
  })
})
