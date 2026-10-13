import { describe, expect, it, vi } from 'vitest'
import { verifyBachsAwardCheckout } from '@/lib/payments/bachs/settlement'

const evidence = { checkoutId: 'chk-1', reference: 'ref-1', orderId: 'order-1', attemptId: 'attempt-1', currency: 'NGN' as const, requestedMinor: 2_500_000 }
const config = { apiBaseUrl: 'https://api.bachs.io', apiKey: 'test-key' }
function checkout() {
  return { checkout_id: 'chk-1', reference: 'ref-1', status: 'completed', payment_status: 'succeeded', currency: 'NGN', amount: '25000.00',
    metadata: { order_id: 'order-1', payment_attempt_id: 'attempt-1', purpose: 'afl_award_fee_v1' },
    charge: { payment_id: 'pay-1', checkout_id: 'chk-1', reference: 'ref-1', status: 'succeeded', currency: 'GHS', amount_paid: '250.79', fees: { currency: 'GHS', amount: '8.48' }, refunds: null } }
}
const fetchFor = (body: unknown) => vi.fn().mockResolvedValue(Response.json(body))
describe('authenticated Bachs checkout reconciliation', () => {
  it('confirms the original NGN price when a successful charge is in GHS', async () => {
    expect(await verifyBachsAwardCheckout(evidence, config, fetchFor(checkout()))).toMatchObject({ status: 'paid', amountMinor: 2_500_000, currency: 'NGN', chargeId: 'pay-1' })
  })
  it('accepts an explained NGN processing fee', async () => {
    const body = checkout(); body.charge = { ...body.charge, currency: 'NGN', amount_paid: '25375.00', fees: { currency: 'NGN', amount: '375.00' } }
    expect(await verifyBachsAwardCheckout(evidence, config, fetchFor(body))).toMatchObject({ status: 'paid' })
    body.charge.fees.amount = '300.00'
    expect(await verifyBachsAwardCheckout(evidence, config, fetchFor(body))).toBeNull()
  })
  it.each(['reference', 'currency', 'amount'])('rejects an incorrect checkout %s', async field => {
    const body = { ...checkout(), [field]: 'different' }
    expect(await verifyBachsAwardCheckout(evidence, config, fetchFor(body))).toBeNull()
  })
  it('rejects wrong metadata, refunds, and an unsuccessful charge', async () => {
    for (const body of [
      { ...checkout(), metadata: { ...checkout().metadata, order_id: 'other' } },
      { ...checkout(), charge: { ...checkout().charge, refunds: [{ status: 'succeeded' }] } },
      { ...checkout(), charge: { ...checkout().charge, status: 'processing' } },
    ]) expect(await verifyBachsAwardCheckout(evidence, config, fetchFor(body))).toBeNull()
  })
  it('only expires a session with no pending or successful charge', async () => {
    const body = { ...checkout(), status: 'expired', payment_status: 'requires_payment_method', charge: null }
    expect(await verifyBachsAwardCheckout(evidence, config, fetchFor(body))).toMatchObject({ status: 'expired' })
    expect(await verifyBachsAwardCheckout(evidence, config, fetchFor({ ...body, charge: { ...checkout().charge, status: 'incomplete' } }))).toMatchObject({ status: 'expired' })
    expect(await verifyBachsAwardCheckout(evidence, config, fetchFor({ ...body, charge: checkout().charge }))).toBeNull()
  })
  it('preserves uncertain provider failures for retry', async () => {
    await expect(verifyBachsAwardCheckout(evidence, config, vi.fn().mockResolvedValue(new Response('', { status: 503 })))).rejects.toThrow()
  })
})
