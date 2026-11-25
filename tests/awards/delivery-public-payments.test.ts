import { describe, expect, it } from 'vitest'
import { verifyPublicDeliveryPayment, syncPublicDeliveryPayments } from '@/lib/awards/delivery/public-payments'
const config = { apiBaseUrl: 'https://sandbox-api.bachs.io', apiKey: 'sk_sandbox_test' }
const payment = () => ({ payment_id: 'ch_test', checkout_id: 'chk_test', status: 'succeeded', amount: '8358.25', amount_paid: '8358.25', amount_remaining: '0.00', currency: 'NGN', merchant_bears_cost: false, fees: { amount: '123.52', currency: 'NGN', breakdown: [{ type: 'processing', amount: '123.52' }] }, meta: { payment_link_id: 'pl_2d4914db4ed0', from_payment_link: true }, customer: { email: 'Member@Example.com' }, refunds: null, completed_at: '2026-11-15T07:51:14Z' })
const checkout = () => ({ checkout_id: 'chk_test', status: 'completed', payment_status: 'succeeded', amount: '8234.73', currency: 'NGN', customer: { email: 'member@example.com' }, metadata: { payment_link_id: 'pl_2d4914db4ed0', from_payment_link: true }, products: [{ product_id: 'prod_595bb57045f149429614', quantity: 1, currency: 'NGN', line_total: '8234.73' }], charge: payment() })
function fetcher(p = payment(), c = checkout()): typeof fetch { return (async url => Response.json(String(url).includes('/checkout-sessions/') ? c : p)) as typeof fetch }
describe('public-link delivery payment verification', () => {
  it('binds a paid delivery checkout to its exact NGN price, email and original completion time', async () => {
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher())).toMatchObject({ charge_id: 'ch_test', checkout_id: 'chk_test', email: 'member@example.com', amount_minor: 823473, currency: 'NGN', paid_at: '2026-11-15T07:51:14Z' })
  })
  it.each(['failed', 'processing', 'underpaid', 'overpaid', 'refunded', 'partially_refunded'])('rejects a %s payment even if the checkout says paid', async status => {
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher({ ...payment(), status }))).toBeNull()
  })
  it('rejects an unrelated product/link and a refunded checkout charge', async () => {
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher({ ...payment(), meta: { payment_link_id: 'award-link', from_payment_link: true } }))).toBeNull()
    const c = checkout(); c.products[0].product_id = 'award-product'
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher(payment(), c))).toBeNull()
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher({ ...payment(), refunds: ['ref_1'] } as never))).toBeNull()
  })
  it('rejects identity, price and unexplained captured amount mismatches', async () => {
    const c = checkout(); c.customer.email = 'other@example.com'
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher(payment(), c))).toBeNull()
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher({ ...payment(), payment_id: 'ch_other' }))).toBeNull()
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher({ ...payment(), amount_paid: '8000.00' }))).toBeNull()
    const wrongPrice = checkout(); wrongPrice.products[0].line_total = '1.00'
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher(payment(), wrongPrice))).toBeNull()
  })
  it('accepts provider-confirmed FX without treating the USD charge as a naira amount', async () => {
    const p = { ...payment(), currency: 'USD', amount: '6.04', amount_paid: '6.04', fees: { amount: '0.76', currency: 'USD', breakdown: [{ type: 'processing', amount: '0.67' }, { type: 'international_card', amount: '0.09' }] } }
    const c = { ...checkout(), charge: p }
    expect(await verifyPublicDeliveryPayment('ch_test', config, fetcher(p, c))).toMatchObject({ amount_minor: 823473, charge_currency: 'USD', gross_amount: '6.04' })
  })
  it('fails closed on provider outages', async () => {
    await expect(verifyPublicDeliveryPayment('ch_test', config, (async () => new Response('', { status: 401 })) as typeof fetch)).rejects.toThrow()
  })
  it('scans every provider page and ignores unrelated payment summaries', async () => {
    let calls = 0
    const db = { rpc: async () => ({ data: { status: 'matched' }, error: null }) }
    const fetchAll = (async url => {
      const path = String(url)
      if (path.includes('/checkout-sessions/')) return Response.json(checkout())
      if (path.includes('/payments/ch_test')) return Response.json(payment())
      calls++
      return Response.json(calls === 1 ? { items: [{ id: 'ch_other', meta: { payment_link_id: 'other' } }], pagination: { has_more: true } } : { items: [{ id: 'ch_test', meta: payment().meta }], pagination: { has_more: false } })
    }) as typeof fetch
    expect(await syncPublicDeliveryPayments(db, config, fetchAll)).toMatchObject({ matched: 1, errors: 0 })
    expect(calls).toBe(2)
  })
})
