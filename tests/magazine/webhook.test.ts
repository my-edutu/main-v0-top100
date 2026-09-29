import { describe, expect, it, vi } from 'vitest'

import { handleBachsMagazineEvent } from '@/lib/magazine/bachs-webhook'
import { bachsConfig } from '@/lib/payments/bachs/config'

const config = bachsConfig({
  NODE_ENV: 'test', BACHS_API_KEY: 'sk_sandbox_key', BACHS_API_BASE_URL: 'https://sandbox-api.bachs.io',
  BACHS_AWARD_WEBHOOK_SECRET: 'award-test-secret', BACHS_MAGAZINE_WEBHOOK_SECRET: 'test-secret', BACHS_CHECKOUT_HOSTS: 'checkout.bachs.io', NEXT_PUBLIC_SITE_URL: 'https://top100afl.com',
})
const attempt = {
  id: '11b7e533-cc9e-4792-a5a8-428a746ae634', order_id: 'mag-order', provider: 'bachs', charge_scope: 'magazine_feature',
  provider_reference: 'AFL-MAG-ref', provider_checkout_id: 'checkout-1', currency: 'NGN', requested_amount_minor: 1_000_000,
}

function setupDb() {
  const rpc = vi.fn().mockResolvedValue({ data: { outcome: 'succeeded' }, error: null })
  const query: any = { select: vi.fn(() => query), eq: vi.fn(() => query), maybeSingle: vi.fn().mockResolvedValue({ data: attempt, error: null }) }
  return { db: { from: vi.fn(() => query), rpc }, rpc, query }
}

function event(purpose = 'afl_magazine_feature_v1') {
  return JSON.stringify({
    id: 'evt-1', type: 'collection.succeeded', created_at: '2026-09-23T10:00:00.000Z', organization_id: null,
    data: { checkout_id: 'checkout-1', reference: attempt.provider_reference, status: 'SUCCEEDED', amount: '10000.00', currency: 'NGN', metadata: { purpose, order_id: attempt.order_id, payment_attempt_id: attempt.id } },
  })
}

describe('isolated magazine Bachs webhook', () => {
  it('processes only a fully matching signed magazine attempt through the magazine RPC', async () => {
    const { db, rpc } = setupDb()
    const result = await handleBachsMagazineEvent(event(), new Headers({ 'x-bachs-timestamp': '1', 'x-bachs-signature': 'a'.repeat(64) }), { db, config, nowSeconds: 1, verify: () => true })
    expect(result).toEqual({ httpStatus: 200, outcome: 'succeeded' })
    expect(rpc).toHaveBeenCalledWith('process_bachs_magazine_webhook_event', expect.objectContaining({ p_attempt_id: attempt.id, p_currency: 'NGN', p_captured_amount_minor: 1_000_000 }))
  })

  it('never routes a different payment purpose to a magazine attempt', async () => {
    const { db, rpc } = setupDb()
    await handleBachsMagazineEvent(event('afl_award_fee_v1'), new Headers(), { db, config, nowSeconds: 1, verify: () => true })
    expect(rpc).toHaveBeenCalledWith('process_bachs_magazine_webhook_event', expect.objectContaining({ p_attempt_id: null }))
  })

  it('preserves the matched attempt when the provider reports an underpaid amount for atomic exception handling', async () => {
    const { db, rpc } = setupDb()
    const underpaid = event().replace('10000.00', '9999.00')
    await handleBachsMagazineEvent(underpaid, new Headers(), { db, config, nowSeconds: 1, verify: () => true })
    expect(rpc).toHaveBeenCalledWith('process_bachs_magazine_webhook_event', expect.objectContaining({ p_attempt_id: attempt.id, p_captured_amount_minor: 999_900 }))
  })

  it('rejects invalid signatures before reading attempts or writing events', async () => {
    const { db, rpc } = setupDb()
    const result = await handleBachsMagazineEvent(event(), new Headers(), { db, config, verify: () => false })
    expect(result.httpStatus).toBe(401)
    expect(db.from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('fails closed when the magazine destination has no signing secret', async () => {
    const { db, rpc } = setupDb()
    const verify = vi.fn(() => true)
    const result = await handleBachsMagazineEvent(event(), new Headers(), {
      db,
      config: { ...config, magazineWebhookSecret: null },
      verify,
    })
    expect(result).toEqual({ httpStatus: 503, outcome: 'configuration_error' })
    expect(verify).not.toHaveBeenCalled()
    expect(db.from).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
})
