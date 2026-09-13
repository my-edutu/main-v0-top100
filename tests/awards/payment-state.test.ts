import { describe, expect, it } from 'vitest'
import { mapPaymentView, parseCheckoutCurrency } from '@/lib/awards/payment-state'

const prices = [{ currency: 'NGN' as const, amountMinor: 2_500_000, display: '₦25,000' }]
describe('award payment view', () => {
  it('starts without requiring a delivery order', () => {
    expect(mapPaymentView(null, [], prices)).toMatchObject({ status: 'unpaid', needsPayment: true, confirmedPayment: null, priceOptions: prices })
  })
  it('honours historical paid orders and displays the award fee without shipping', () => {
    expect(mapPaymentView({ status: 'dispatched', award_amount_kobo: 2_000_000, paid_at: '2026-08-01T00:00:00Z' }, [], prices)).toMatchObject({ status: 'paid', needsPayment: false, confirmedPayment: { currency: 'NGN', amountMinor: 2_000_000 } })
  })
  it('blocks a second payment while a historical checkout is unresolved', () => {
    expect(mapPaymentView({status:'awaiting_payment',paystack_reference:'old-reference'}, [], prices).status).toBe('pending')
  })
  it('uses the captured successful attempt even when another attempt is newer', () => {
    const paid = { id: 'paid', status: 'succeeded', currency: 'USD', requested_amount_minor: 2000, captured_amount_minor: 2000, confirmed_at: '2026-09-08T00:00:00Z' }
    expect(mapPaymentView({ status: 'draft', award_payment_status: 'paid', award_paid_attempt_id: 'paid', award_paid_at: paid.confirmed_at }, [{ id: 'later', status: 'duplicate_succeeded' }, paid], prices)).toMatchObject({ status: 'paid', needsPayment: false, currentAttempt: null, confirmedPayment: { currency: 'USD', amountMinor: 2000 } })
  })
  it('does not offer a new payment when a checkout creation result is uncertain', () => {
    expect(mapPaymentView({ status: 'draft', award_payment_status: 'pending' }, [{ id: 'a', status: 'creating', currency: 'NGN', requested_amount_minor: 2_500_000 }], prices)).toMatchObject({ status: 'pending', currentAttempt: { status: 'creating' } })
  })
  it('keeps late-webhook exceptions pending for support reconciliation', () => {
    expect(mapPaymentView({ status: 'draft', award_payment_status: 'pending' }, [{ id: 'a', status: 'underpaid', currency: 'NGN', requested_amount_minor: 2_500_000 }], prices).status).toBe('pending')
  })
  it.each([
    ['failed', 'failed'],
    ['expired', 'failed'],
    ['cancelled', 'failed'],
    ['abandoned', 'failed'],
    ['reversed', 'failed'],
  ] as const)('shows a terminal legacy Paystack status %s as retryable failure', (paystack_status, expected) => {
    expect(mapPaymentView({ status: 'awaiting_payment', paystack_reference: 'legacy-ref', paystack_status }, [], prices).status).toBe(expected)
  })
  it('keeps an unresolved legacy reference pending', () => {
    expect(mapPaymentView({ status: 'awaiting_payment', paystack_reference: 'legacy-ref', paystack_status: 'processing' }, [], prices).status).toBe('pending')
  })
  it('lets a newer Bachs summary keep precedence over old legacy evidence', () => {
    const order = { status: 'awaiting_payment', paystack_reference: 'legacy-ref', paystack_status: 'failed' }
    expect(mapPaymentView({ ...order, award_payment_status: 'paid' }, [], prices).status).toBe('paid')
    expect(mapPaymentView({ ...order, award_payment_status: 'refunded' }, [], prices).status).toBe('refunded')
    expect(mapPaymentView({ ...order, award_payment_status: 'pending' }, [], prices).status).toBe('pending')
  })
  it('does not infer a pending payment from a cancelled legacy order or override a canonical failure', () => {
    expect(mapPaymentView({ status: 'cancelled', paystack_reference: 'legacy-ref' }, [], prices).status).not.toBe('pending')
    expect(mapPaymentView({ status: 'draft', paystack_reference: 'legacy-ref', award_payment_status: 'failed' }, [], prices).status).toBe('failed')
  })
})
describe('checkout currency input', () => {
  it.each(['NGN','USD'])('accepts only currency %s', currency => expect(parseCheckoutCurrency({ currency })).toBe(currency))
  it.each([null, {}, {currency:'EUR'}, {currency:['NGN']}, {currency:{value:'NGN'}}, {currency:'NGN', amount:1}, {currency:'NGN', amountMinor:1}])('rejects invalid request %j', value => expect(() => parseCheckoutCurrency(value)).toThrow())
})
