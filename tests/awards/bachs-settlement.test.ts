import { describe, expect, it, vi } from 'vitest'
import { verifiedBachsAwardAmount } from '@/lib/payments/bachs/settlement'

const evidence = {
  checkoutId: 'chk-1', reference: 'ref-1', chargeId: 'ch-1',
  orderId: 'order-1', attemptId: 'attempt-1', currency: 'NGN' as const,
  requestedMinor: 2_500_000, grossMinor: 2_537_500,
}
const config = { apiBaseUrl: 'https://api.bachs.io', apiKey: 'test-key' }
function checkout() {
  return {
    checkout_id: 'chk-1', reference: 'ref-1', status: 'completed', payment_status: 'succeeded',
    amount: '25000.00', currency: 'NGN',
    metadata: { order_id: 'order-1', payment_attempt_id: 'attempt-1', purpose: 'afl_award_fee_v1' },
    charge: { payment_id: 'ch-1', checkout_id: 'chk-1', reference: 'ref-1', status: 'succeeded',
      amount_paid: '25375.00', currency: 'NGN', fees: { amount: '375.00', currency: 'NGN' }, refunds: null },
  }
}
const fetchFor = (body: unknown) => vi.fn().mockResolvedValue(Response.json(body))

describe('verifiedBachsAwardAmount', () => {
  it('accepts the award principal when the entire excess is an authenticated provider fee', async () => {
    const fetcher = fetchFor(checkout())
    expect(await verifiedBachsAwardAmount(evidence, config, fetcher)).toBe(2_500_000)
    expect(fetcher).toHaveBeenCalledWith('https://api.bachs.io/v1/checkout-sessions/chk-1', expect.objectContaining({
      headers: { Authorization: 'Bearer test-key', Accept: 'application/json' }, cache: 'no-store',
    }))
  })
  it('keeps genuine excess payments as exceptions', async () => {
    const body = checkout(); body.charge.fees.amount = '300.00'
    expect(await verifiedBachsAwardAmount(evidence, config, fetchFor(body))).toBeNull()
  })
  it.each(['order_id', 'payment_attempt_id', 'purpose'])('rejects mismatched %s', async key => {
    const body = checkout(); body.metadata[key as keyof typeof body.metadata] = 'different'
    expect(await verifiedBachsAwardAmount(evidence, config, fetchFor(body))).toBeNull()
  })
  it('rejects a different charge, currency, or unsuccessful checkout', async () => {
    for (const change of [
      (body: ReturnType<typeof checkout>) => { body.charge.payment_id = 'other' },
      (body: ReturnType<typeof checkout>) => { body.charge.fees.currency = 'USD' },
      (body: ReturnType<typeof checkout>) => { body.payment_status = 'processing' },
    ]) {
      const body = checkout(); change(body)
      expect(await verifiedBachsAwardAmount(evidence, config, fetchFor(body))).toBeNull()
    }
  })
  it('throws on provider outages so the delivery can retry without recording a false failure', async () => {
    await expect(verifiedBachsAwardAmount(evidence, config, vi.fn().mockResolvedValue(new Response('', { status: 503 })))).rejects.toThrow()
  })
})
