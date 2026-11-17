import { parseBachsAmount } from '@/lib/payments/bachs/money'
import { isBachsTerminalSuccess } from '@/lib/payments/bachs/events'
import { DELIVERY_PURPOSE } from './types'

export const DELIVERY_PAYMENT_LINK_ID = 'pl_2d4914db4ed0'
const DELIVERY_PRODUCT_ID = 'prod_595bb57045f149429614'
type Config = { apiBaseUrl: string; apiKey: string }
type DB = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> }
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const email = (v: unknown) => typeof v === 'string' ? v.trim().toLowerCase() : ''
const noRefunds = (v: unknown) => v == null || Array.isArray(v) && v.length === 0
const linked = (v: unknown) => record(v).payment_link_id === DELIVERY_PAYMENT_LINK_ID
function minor(v: unknown): number | null {
  try { return typeof v === 'string' ? parseBachsAmount(v, 'NGN') : null } catch { return null }
}
async function get(path: string, config: Config, fetcher: typeof fetch) {
  const res = await fetcher(`${config.apiBaseUrl}/v1/${path}`, { headers: { Authorization: `Bearer ${config.apiKey}`, Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`Bachs delivery verification failed (${res.status}).`)
  return record(await res.json())
}
export type PublicDeliveryEvidence = {
  source: 'bachs_public_delivery_link'; purpose: typeof DELIVERY_PURPOSE; status: 'paid'
  payment_link_id: string; product_id: string; checkout_id: string; charge_id: string
  email: string; amount_minor: number; currency: 'NGN'; paid_at: string
  charge_currency: string; gross_amount: string; provider_reference: string | null
}
/** Both objects come from authenticated Bachs reads, never webhook/client amounts. */
export async function verifyPublicDeliveryPayment(id: string, config: Config, fetcher: typeof fetch = fetch): Promise<PublicDeliveryEvidence | null> {
  if (!/^ch_[a-zA-Z0-9]+$/.test(id)) return null
  const p = await get(`payments/${encodeURIComponent(id)}`, config, fetcher)
  if (p.payment_id !== id || !linked(p.meta) || !isBachsTerminalSuccess(p.status) || !noRefunds(p.refunds) || typeof p.checkout_id !== 'string') return null
  const c = await get(`checkout-sessions/${encodeURIComponent(p.checkout_id)}`, config, fetcher)
  const charge = record(c.charge)
  const customerEmail = email(record(p.customer).email)
  const checkoutEmail = email(record(c.customer).email)
  const amount = minor(c.amount)
  const products = Array.isArray(c.products) ? c.products.map(record) : []
  if (c.checkout_id !== p.checkout_id || !linked(c.metadata) || c.status !== 'completed' || c.payment_status !== 'succeeded' ||
      c.currency !== 'NGN' || !amount || amount <= 0 || !customerEmail || !customerEmail.includes('@') || customerEmail !== checkoutEmail ||
      charge.payment_id !== id || charge.checkout_id !== c.checkout_id || !isBachsTerminalSuccess(charge.status) || !noRefunds(charge.refunds) ||
      charge.currency !== p.currency || charge.amount_paid !== p.amount_paid ||
      products.length !== 1 || products[0].product_id !== DELIVERY_PRODUCT_ID || products[0].quantity !== 1 || products[0].currency !== 'NGN' || minor(products[0].line_total) !== amount ||
      typeof p.completed_at !== 'string' || !Number.isFinite(Date.parse(p.completed_at)) || Date.parse(p.completed_at) > Date.now() + 300_000 ||
      typeof p.currency !== 'string' || !/^[A-Z]{3}$/.test(p.currency) || !minor(p.amount_paid) || minor(p.amount_remaining) !== 0) return null
  // A completed foreign-currency checkout is Bachs' conversion contract. For
  // NGN, independently check that only the customer processing fee is added.
  if (p.currency === 'NGN') {
    const fees = record(p.fees)
    const processing = (Array.isArray(fees.breakdown) ? fees.breakdown.map(record) : []).filter(f => f.type === 'processing')
    const customerFee = p.merchant_bears_cost === false && processing.length === 1 ? minor(processing[0].amount) : 0
    if (customerFee === null || (p.fees != null && fees.currency !== 'NGN') || minor(p.amount_paid)! - customerFee !== amount) return null
  }
  return { source: 'bachs_public_delivery_link', purpose: DELIVERY_PURPOSE, status: 'paid', payment_link_id: DELIVERY_PAYMENT_LINK_ID, product_id: DELIVERY_PRODUCT_ID,
    checkout_id: p.checkout_id, charge_id: id, email: customerEmail, amount_minor: amount, currency: 'NGN', paid_at: p.completed_at,
    charge_currency: p.currency, gross_amount: p.amount_paid as string, provider_reference: typeof p.reference === 'string' ? p.reference : null }
}
export async function reconcilePublicDeliveryPayment(id: string, db: DB, config: Config, fetcher: typeof fetch = fetch) {
  const evidence = await verifyPublicDeliveryPayment(id, config, fetcher)
  if (!evidence) return { status: 'unverified' }
  const result = await db.rpc('reconcile_public_award_delivery_payment', { p_evidence: evidence })
  if (result.error) throw new Error('Delivery payment could not be recorded.')
  return record(result.data)
}
/** Scan full history so a missed webhook or previously unmatched quote recovers. */
export async function syncPublicDeliveryPayments(db: DB, config: Config, fetcher: typeof fetch = fetch) {
  const result = { scanned: 0, matched: 0, review: 0, errors: 0 }
  let offset = 0
  for (let page = 0; page < 100; page++) {
    const data = await get(`payments?limit=100&offset=${offset}`, config, fetcher)
    if (!Array.isArray(data.items)) throw new Error('Bachs returned an invalid payments page.')
    for (const item of data.items.map(record)) {
      result.scanned++
      if (!linked(item.meta)) continue
      const id = item.id ?? item.payment_id
      if (typeof id !== 'string') { result.errors++; continue }
      try {
        const settled = await reconcilePublicDeliveryPayment(id, db, config, fetcher)
        if (settled.status === 'matched') result.matched++
        else result.review++
      } catch { result.errors++ }
    }
    if (record(data.pagination).has_more === false || data.items.length === 0) return result
    offset += data.items.length
  }
  throw new Error('Bachs payment history exceeded the reconciliation page limit.')
}

export async function reconcilePublicDeliveryNotification(data: Record<string, unknown>, db: DB, config: Config, fetcher: typeof fetch = fetch) {
  let id = data.payment_id ?? data.charge_id ?? record(data.charge).payment_id
  if (typeof id !== 'string' && typeof data.checkout_id === 'string') {
    const checkout = await get(`checkout-sessions/${encodeURIComponent(data.checkout_id)}`, config, fetcher)
    id = record(checkout.charge).payment_id
  }
  if (typeof id !== 'string') return { status: 'unverified' }
  return reconcilePublicDeliveryPayment(id, db, config, fetcher)
}
