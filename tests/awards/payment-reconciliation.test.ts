import { describe, expect, it, vi } from 'vitest'
import { reconcileAwardAttempt } from '@/lib/awards/payment-reconciliation'

const attempt = { id: 'attempt-1', order_id: 'order-1', provider: 'bachs', charge_scope: 'award_fee', status: 'open', currency: 'NGN', requested_amount_minor: 2_500_000, provider_checkout_id: 'chk-1', provider_reference: 'ref-1' }
const config = { apiBaseUrl: 'https://api.bachs.io', apiKey: 'test-key' } as any
const checkout = { checkout_id: 'chk-1', reference: 'ref-1', currency: 'NGN', amount: '25000.00', status: 'completed', payment_status: 'succeeded',
  metadata: { order_id: 'order-1', payment_attempt_id: 'attempt-1', purpose: 'afl_award_fee_v1' },
  charge: { payment_id: 'pay-1', checkout_id: 'chk-1', reference: 'ref-1', status: 'succeeded', currency: 'GHS', amount_paid: '250.79', fees: { currency: 'GHS', amount: '8.48' }, refunds: null } }
function db() {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { profile_id: 'profile-1', recipient_name: 'Member', email: 'member@example.com', award_payment_status: 'paid', award_paid_at: '2026-10-13T00:00:00.000Z', award_paid_attempt_id: 'attempt-1' }, error: null }) }
  return { from: vi.fn().mockReturnValue(query), rpc: vi.fn().mockResolvedValue({ data: { outcome: 'succeeded', notification_needed: true }, error: null }) }
}
describe('award payment recovery', () => {
  it('records original fee after provider-verified converted payment, with separate audit evidence', async () => {
    const client = db()
    const notify = vi.fn().mockResolvedValue({ channels: ['email'], errors: [] })
    const result = await reconcileAwardAttempt(client, attempt, { config, notify, fetchProvider: vi.fn().mockResolvedValue(Response.json(checkout)) })
    expect(result).toEqual({ outcome: 'succeeded', notificationNeeded: true })
    expect(client.rpc).toHaveBeenCalledWith('reconcile_bachs_award_checkout', expect.objectContaining({ p_attempt_id: 'attempt-1', p_checkout: expect.objectContaining({ amount_minor: 2_500_000, currency: 'NGN', status: 'paid', charge_currency: 'GHS', charge_id: 'pay-1' }) }))
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-1', currency: 'NGN', amountMinor: 2_500_000 }), { db: client })
  })
  it.each(['USD', 'KES', 'XAF', 'GHS', 'XOF'])('confirms a provider-paid NGN coupon checkout collected in %s', async chargeCurrency => {
    const client = db(), notify = vi.fn()
    const paid = { ...checkout, amount: '20000.00', charge: { ...checkout.charge, currency: chargeCurrency, status: chargeCurrency === 'KES' ? 'accepted' : 'succeeded', fees: { currency: chargeCurrency, amount: '8.48' } } }
    const result = await reconcileAwardAttempt(client, { ...attempt, award_coupon_id: 'coupon-1', requested_amount_minor: 2_000_000 }, { config, notify, fetchProvider: vi.fn().mockResolvedValue(Response.json(paid)) })
    expect(result).toEqual({ outcome: 'succeeded', notificationNeeded: true })
    expect(client.rpc).toHaveBeenCalledWith('reconcile_bachs_award_checkout', expect.objectContaining({ p_checkout: expect.objectContaining({ currency: 'NGN', amount_minor: 2_000_000, charge_currency: chargeCurrency, gross_amount: '250.79' }) }))
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ currency: 'NGN', amountMinor: 2_000_000 }), { db: client })
  })
  it.each([
    { amount: '19999.99' }, { currency: 'USD' }, { status: 'open' },
    { charge: { ...checkout.charge, refunds: ['refund-1'] } },
    { metadata: { ...checkout.metadata, order_id: 'different-order' } },
  ])('holds a coupon payment whose authenticated contract does not verify (%j)', async changed => {
    const client = db()
    const result = await reconcileAwardAttempt(client, { ...attempt, award_coupon_id: 'coupon-1', requested_amount_minor: 2_000_000 }, { config, fetchProvider: vi.fn().mockResolvedValue(Response.json({ ...checkout, amount: '20000.00', ...changed })) })
    expect(result.outcome).toBe('review_required')
    expect(client.rpc).not.toHaveBeenCalled()
  })
  it('does not release a reservation from its local expiry alone', async () => {
    const client = db()
    await reconcileAwardAttempt(client, attempt, { config, fetchProvider: vi.fn().mockResolvedValue(Response.json({ ...checkout, status: 'expired' })) })
    expect(client.rpc).not.toHaveBeenCalled()
  })
  it.each(['failed', 'expired', 'exception'])('recovers %s only after authenticating the original paid checkout', async status => {
    const client = db()
    const result = await reconcileAwardAttempt(client, { ...attempt, status }, { config, notify: vi.fn(), fetchProvider: vi.fn().mockResolvedValue(Response.json(checkout)) })
    expect(result.outcome).toBe('succeeded')
  })
  it.each(['refunded', 'underpaid', 'succeeded'])('leaves %s to its existing terminal workflow', async status => {
    const client = db(), fetchProvider = vi.fn()
    await reconcileAwardAttempt(client, { ...attempt, status }, { config, fetchProvider })
    expect(fetchProvider).not.toHaveBeenCalled(); expect(client.rpc).not.toHaveBeenCalled()
  })
  it('does not claim a checkout whose metadata belongs to another order', async () => {
    const client = db()
    await reconcileAwardAttempt(client, attempt, { config, fetchProvider: vi.fn().mockResolvedValue(Response.json({ ...checkout, metadata: { ...checkout.metadata, order_id: 'other' } })) })
    expect(client.rpc).not.toHaveBeenCalled()
  })
  it('does not hide a failed database transaction', async () => {
    const client = db(); client.rpc.mockResolvedValue({ data: null, error: { message: 'unavailable' } } as any)
    await expect(reconcileAwardAttempt(client, attempt, { config, fetchProvider: vi.fn().mockResolvedValue(Response.json(checkout)) })).rejects.toThrow()
  })
})
