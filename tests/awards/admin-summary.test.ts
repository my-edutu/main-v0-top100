import { describe, expect, it } from 'vitest'

import { buildAdminAwardSummary, hasVerifiedAwardPayment } from '../../lib/awards/admin-summary'

describe('admin award payment summary', () => {
  it('counts a Bachs payment only when the canonical paid attempt succeeded', () => {
    const orders = [
      {
        id: 'verified', status: 'paid', awardPaymentStatus: 'paid', awardPaidAttemptId: 'attempt-1', waybill: null,
        paymentAttempts: [{ id: 'attempt-1', provider: 'bachs', chargeScope: 'award_fee', status: 'succeeded', paidAt: '2026-10-01T00:00:00Z' }],
      },
      {
        id: 'manual-status-only', status: 'paid', awardPaidAttemptId: null, waybill: null,
        paymentAttempts: [],
      },
      {
        id: 'noncanonical-success', status: 'paid', awardPaymentStatus: 'paid', awardPaidAttemptId: 'attempt-2', waybill: null,
        paymentAttempts: [{ id: 'attempt-1', provider: 'bachs', chargeScope: 'award_fee', status: 'succeeded', paidAt: '2026-10-01T00:00:00Z' }],
      },
    ]

    expect(hasVerifiedAwardPayment(orders[0])).toBe(true)
    expect(hasVerifiedAwardPayment(orders[1])).toBe(false)
    expect(hasVerifiedAwardPayment(orders[2])).toBe(false)
    expect(buildAdminAwardSummary(orders)).toMatchObject({ confirmedPayments: 1, dispatchNeeded: 1 })
  })

  it('counts a legacy Paystack payment only with successful status and a confirmation timestamp', () => {
    expect(hasVerifiedAwardPayment({
      awardPaymentStatus: 'paid', awardPaidAttemptId: null,
      paymentAttempts: [{ id: null, provider: 'paystack', isLegacy: true, status: 'success', paidAt: '2026-10-01T00:00:00Z', providerReference: 'ref-123' }],
    })).toBe(true)
    expect(hasVerifiedAwardPayment({
      awardPaymentStatus: 'paid', awardPaidAttemptId: null,
      paymentAttempts: [{ id: null, provider: 'paystack', isLegacy: true, status: 'paid', paidAt: null, providerReference: 'ref-123' }],
    })).toBe(false)
  })

  it('keeps delivery and exception stats tied to order and attempt API data', () => {
    expect(buildAdminAwardSummary([
      { status: 'in_transit', paymentAttempts: [] },
      { status: 'quote_failed', paymentAttempts: [{ status: 'underpaid' }] },
      { status: 'awaiting_payment', paymentAttempts: [{ status: 'failed' }] },
      { status: 'awaiting_payment', paymentAttempts: [{ status: 'failed', failureReason: 'Provider declined payment' }] },
    ])).toMatchObject({ totalOrders: 4, paymentExceptions: 2, quoteFailures: 1, inDelivery: 1 })
  })

  it('marks payment-derived counts unavailable when the API cannot load the attempt ledger', () => {
    expect(buildAdminAwardSummary([{ status: 'paid' }], false)).toMatchObject({
      paymentDataAvailable: false,
      confirmedPayments: null,
      dispatchNeeded: null,
      paymentExceptions: null,
      totalOrders: 1,
    })
  })
})
