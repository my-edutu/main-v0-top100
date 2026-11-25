import 'server-only'
import { hasDeliveryPaymentEvidence, type DeliveryRow } from '@/lib/awards/delivery/server'
import { createAdminClient } from '@/lib/supabase/server'
import { FESTIVAL_KEY } from './config'
import { buildFulfillmentRoster, type FulfillmentOrder, type FulfillmentSources } from './fulfillment'

type Db = ReturnType<typeof createAdminClient>
type Delivery = Pick<DeliveryRow,
  'id' | 'order_id' | 'member_id' | 'quote_input' | 'amount_minor' | 'currency' | 'status' | 'reference' |
  'checkout_id' | 'charge_id' | 'paid_at' | 'payment_evidence' | 'expires_at' | 'waybill'
>
type Receipt = {
  status: 'matched' | 'review'
  charge_id: string
  checkout_id: string
  delivery_id: string | null
  evidence: { email?: string }
}

async function readRows<Row extends Record<Key, string>, Key extends string>(
  db: Db, table: string, columns: string, key: Key, festival = false,
): Promise<Row[]> {
  const rows: Row[] = []
  let cursor: string | undefined
  for (;;) {
    let query = db.from(table).select(columns).order(key).limit(500)
    if (festival) query = query.eq('festival_key', FESTIVAL_KEY)
    if (cursor) query = query.gt(key, cursor)
    const { data, error } = await query
    if (error) throw new Error(`Could not load ${table} (code ${error.code}).`)
    const batch = data as unknown as Row[]
    if (!batch.length) return rows
    rows.push(...batch)
    const last = batch.at(-1)?.[key]
    if (!last || last === cursor) throw new Error(`Could not paginate ${table}.`)
    cursor = last
  }
}

export async function loadFestivalFulfillment(db: Db = createAdminClient()) {
  const [orders, attempts, profiles, rawAwardees, responses, tickets, deliveryOrders, receipts] = await Promise.all([
    readRows<FulfillmentOrder, 'id'>(db, 'award_orders',
      'id,profile_id,awardee_id,recipient_name,email,phone,city,country,gig_waybill,status,award_payment_status,award_paid_attempt_id,award_paid_at,award_amount_kobo,paid_at,paystack_reference,paystack_status', 'id'),
    readRows<FulfillmentSources['attempts'][number], 'id'>(db, 'award_payment_attempts',
      'id,order_id,provider,charge_scope,status,currency,requested_amount_minor,captured_amount_minor,confirmed_at', 'id'),
    readRows<FulfillmentSources['profiles'][number], 'id'>(db, 'profiles', 'id,full_name,email,phone', 'id'),
    readRows<Omit<FulfillmentSources['awardees'][number], 'full_name'> & { name: string | null }, 'id'>(
      db, 'awardees', 'id,profile_id,name,email,phone', 'id'),
    readRows<FulfillmentSources['responses'][number], 'member_id'>(db, 'festival_rsvps',
      'member_id,attending,pickup,pickup_delegate,dispatch,awardee_name,awardee_email,awardee_phone', 'member_id', true),
    readRows<FulfillmentSources['tickets'][number], 'member_id'>(db, 'festival_attendance_interests',
      'member_id,registered_at,pickup_requested,ticket_id,full_name,phone', 'member_id', true),
    readRows<Delivery & { created_at: string }, 'id'>(db, 'award_delivery_orders',
      'id,order_id,member_id,quote_input,amount_minor,currency,status,reference,checkout_id,charge_id,paid_at,payment_evidence,expires_at,waybill,created_at', 'id'),
    readRows<Receipt, 'charge_id'>(db, 'award_delivery_payment_receipts', 'charge_id,checkout_id,delivery_id,status,evidence', 'charge_id'),
  ])
  const receiptsByCharge = new Map(receipts.map((receipt) => [receipt.charge_id, receipt]))
  const verifiedReceipts = new Set<string>()
  const deliveries = deliveryOrders.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id)).map((row) => {
    const receipt = receiptsByCharge.get(row.charge_id ?? '')
    const receiptMatches = receipt?.status === 'matched' && receipt.delivery_id === row.id && receipt.checkout_id === row.checkout_id
    const publicCheckout = row.payment_evidence?.source === 'bachs_public_delivery_link' || Boolean(receipt)
    const verified = row.currency === 'NGN' && Number.isSafeInteger(Number(row.amount_minor)) && Number(row.amount_minor) > 0 &&
      ['paid', 'booking', 'dispatched', 'needs_review'].includes(row.status) && hasDeliveryPaymentEvidence(row) &&
      (!publicCheckout || receiptMatches)
    if (verified && receipt) verifiedReceipts.add(receipt.charge_id)
    return {
      id: row.id, order_id: row.order_id, member_id: row.member_id, status: row.status, verified,
      possiblePayment: Boolean(row.paid_at || row.charge_id || row.waybill || ['paid', 'booking', 'dispatched', 'needs_review'].includes(row.status)),
      recipient: row.quote_input?.recipientName ?? '', phone: row.quote_input?.phone ?? '',
      city: row.quote_input?.city ?? '', country: row.quote_input?.country ?? '',
      waybill: row.waybill, paidAt: row.paid_at, expiresAt: row.expires_at, amountMinor: Number(row.amount_minor),
    }
  })
  return buildFulfillmentRoster({
    orders, attempts, profiles, awardees: rawAwardees.map((item) => ({ ...item, full_name: item.name })),
    responses, tickets, deliveries,
    unmatchedReceipts: receipts.filter((receipt) => !verifiedReceipts.has(receipt.charge_id))
      .map((receipt) => ({ email: receipt.evidence?.email ?? null })),
  })
}
