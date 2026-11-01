import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ reconcile: vi.fn() }))
vi.mock('@/lib/awards/delivery/server', () => ({ reconcileDeliveryRow: state.reconcile }))
import { handleDeliveryWebhook } from '@/lib/awards/delivery/webhook'
import type { BachsConfig } from '@/lib/payments/bachs/types'
const config: BachsConfig = { apiBaseUrl: 'https://sandbox-api.bachs.io', apiKey: 'sk_sandbox_test', awardWebhookSecret: 'secret', magazineWebhookSecret: null, organizationId: 'org-1', webhookToleranceSeconds: 300, checkoutHosts: new Set(['checkout.bachs.io']), siteUrl: 'https://top100afl.com' }
const id = '3b1ab34c-af79-42de-857c-b56e2aa1aa01'
const row = { id, reference: 'delivery-reference', checkout_id: 'chk-1', status: 'open' }
function request(data: Record<string, unknown> = {}, organization = 'org-1') {
  const raw = JSON.stringify({ id: 'evt-1', type: 'checkout.completed', created_at: new Date().toISOString(), organization_id: organization, data: { reference: row.reference, metadata: { purpose: 'afl_award_delivery_v1' }, ...data } })
  const stamp = String(Math.floor(Date.now() / 1000))
  const headers = new Headers({ 'x-bachs-timestamp': stamp, 'x-bachs-signature': createHmac('sha256', 'secret').update(`${stamp}.${raw}`).digest('hex') })
  return { raw, headers }
}
function database(current: unknown = row, error: unknown = null) {
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => ({ data: current, error })) }
  return { from: vi.fn(() => chain), rpc: vi.fn(), chain }
}
beforeEach(() => vi.resetAllMocks())
describe('separate delivery webhook routing', () => {
  it('resolves reference-only notifications and rechecks authenticated provider evidence', async () => {
    const req = request(); const db = database()
    expect(await handleDeliveryWebhook(req.raw, req.headers, db, config)).toBe(200)
    expect(db.chain.eq).toHaveBeenCalledWith('reference', row.reference)
    expect(state.reconcile).toHaveBeenCalledWith(row, db)
  })
  it('preserves existing award-fee event routing', async () => {
    const req = request({ metadata: { purpose: 'afl_award_fee_v1' } }); const db = database()
    expect(await handleDeliveryWebhook(req.raw, req.headers, db, config)).toBeNull()
    expect(db.from).not.toHaveBeenCalled(); expect(state.reconcile).not.toHaveBeenCalled()
  })
  it('never processes forged or wrong-organization notifications', async () => {
    const req = request(); const db = database()
    expect(await handleDeliveryWebhook(req.raw + ' ', req.headers, db, config)).toBeNull()
    const wrong = request({}, 'other-org')
    expect(await handleDeliveryWebhook(wrong.raw, wrong.headers, db, config)).toBe(400)
    expect(state.reconcile).not.toHaveBeenCalled()
  })
  it('requests retry when the canonical checkout is not bound yet', async () => {
    const req = request({ metadata: { purpose: 'afl_award_delivery_v1', payment_attempt_id: id } })
    expect(await handleDeliveryWebhook(req.raw, req.headers, database({ ...row, checkout_id: null }), config)).toBe(503)
    expect(state.reconcile).not.toHaveBeenCalled()
  })
  it('requests retry when an early checkout notification arrives before binding can locate its row', async () => {
    const req = request({ reference: undefined, checkout_id: 'chk-1' })
    expect(await handleDeliveryWebhook(req.raw, req.headers, database(null), config)).toBe(503)
    expect(state.reconcile).not.toHaveBeenCalled()
  })
  it('rejects notifications pointing at another checkout without booking', async () => {
    const req = request({ checkout_id: 'wrong', metadata: { purpose: 'afl_award_delivery_v1', payment_attempt_id: id } })
    expect(await handleDeliveryWebhook(req.raw, req.headers, database(), config)).toBe(400)
    expect(state.reconcile).not.toHaveBeenCalled()
  })
  it('asks the provider to retry an unknown reconciliation outcome', async () => {
    state.reconcile.mockRejectedValue(new Error('provider timeout'))
    const req = request()
    expect(await handleDeliveryWebhook(req.raw, req.headers, database(), config)).toBe(503)
  })
  it('does not break unrelated legacy events while the additive table is unavailable', async () => {
    const req = request({ metadata: undefined })
    expect(await handleDeliveryWebhook(req.raw, req.headers, database(null, { code: '42P01' }), config)).toBeNull()
  })
})
