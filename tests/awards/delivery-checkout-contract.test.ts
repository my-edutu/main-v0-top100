import { describe, expect, it } from 'vitest'
import { buildCheckoutRequest } from '@/lib/payments/bachs/checkout'
import { verifyBachsAwardCheckout } from '@/lib/payments/bachs/settlement'
import { bachsConfig } from '@/lib/payments/bachs/config'
const config = bachsConfig({ NODE_ENV: 'test', BACHS_API_KEY: 'sk_sandbox_delivery', BACHS_API_BASE_URL: 'https://sandbox-api.bachs.io', NEXT_PUBLIC_SITE_URL: 'https://top100afl.com' })
describe('separate delivery payment contract', () => {
  it('bills only the exact carrier quote in NGN under the delivery purpose', () => {
    const body = buildCheckoutRequest({ orderId: 'delivery-1', attemptId: 'delivery-1', reference: 'delivery-ref', idempotencyKey: 'delivery-key', currency: 'NGN', purpose: 'afl_award_delivery_v1', deliveryAmountMinor: 513550, customer: { email: 'member@example.com' }, config })
    expect(body.pricing).toEqual({ currency: 'NGN', amount: '5135.50' })
    expect(body.metadata).toEqual({ order_id: 'delivery-1', payment_attempt_id: 'delivery-1', purpose: 'afl_award_delivery_v1' })
    expect(body.billing_currency).toBe('NGN')
  })
  it('never accepts an award-fee checkout as delivery evidence or vice versa', async () => {
    const evidence = { checkoutId: 'chk-1', reference: 'delivery-ref', orderId: 'delivery-1', attemptId: 'delivery-1', currency: 'NGN' as const, requestedMinor: 513550, purpose: 'afl_award_delivery_v1' as const }
    const checkout = { checkout_id: 'chk-1', reference: 'delivery-ref', status: 'completed', payment_status: 'succeeded', currency: 'NGN', amount: '5135.50', metadata: { order_id: 'delivery-1', payment_attempt_id: 'delivery-1', purpose: 'afl_award_delivery_v1' }, charge: { payment_id: 'pay-1', checkout_id: 'chk-1', reference: 'delivery-ref', status: 'succeeded', currency: 'NGN', amount_paid: '5135.50', fees: null, refunds: null } }
    expect(await verifyBachsAwardCheckout(evidence, config, async () => Response.json(checkout))).toMatchObject({ status: 'paid', amountMinor: 513550 })
    expect(await verifyBachsAwardCheckout({ ...evidence, purpose: undefined }, config, async () => Response.json(checkout))).toBeNull()
    expect(await verifyBachsAwardCheckout(evidence, config, async () => Response.json({ ...checkout, metadata: { ...checkout.metadata, purpose: 'afl_award_fee_v1' } }))).toBeNull()
  })
})
