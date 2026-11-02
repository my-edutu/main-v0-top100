import { expect, it } from 'vitest'
import { mapPaymentView } from '@/lib/awards/payment-state'
it('never confirms payment from a paid order flag without provider evidence', () => {
  const result = mapPaymentView({ status: 'paid', award_payment_status: 'paid' }, [], [])
  expect(result.status).not.toBe('paid')
  expect(result.confirmedPayment).toBeNull()
})
it('rejects a failed canonical attempt even when the order claims paid', () => {
  expect(mapPaymentView({ award_payment_status: 'paid', award_paid_attempt_id: 'a' }, [{ id: 'a', status: 'failed', currency: 'NGN', requested_amount_minor: 2500000 }], []).confirmedPayment).toBeNull()
})
it('accepts a canonical, provider-confirmed award fee and a verified legacy charge', () => {
  expect(mapPaymentView({ award_payment_status: 'paid', award_paid_attempt_id: 'a' }, [{ id: 'a', provider: 'bachs', charge_scope: 'award_fee', status: 'succeeded', confirmed_at: '2026-11-01T00:00:00Z', currency: 'NGN', requested_amount_minor: 2500000, captured_amount_minor: 2500000 }], []).status).toBe('paid')
  expect(mapPaymentView({ status: 'paid', paystack_reference: 'ref', paystack_status: 'success', paid_at: '2026-11-01T00:00:00Z', award_amount_kobo: 2500000 }, [], []).status).toBe('paid')
})
