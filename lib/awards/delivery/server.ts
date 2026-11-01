import { createAdminClient } from '@/lib/supabase/server'
import { getAwardPaymentView } from '@/lib/awards/payment-server'
import { getCourier } from '@/lib/courier'
import { isNigerianCoordinate } from '@/lib/geocoding/geoapify'
import { bachsConfig } from '@/lib/payments/bachs/config'
import { buildCheckoutRequest, createCheckoutSession, isDefinitiveNoSessionError } from '@/lib/payments/bachs/checkout'
import { verifyBachsAwardCheckout } from '@/lib/payments/bachs/settlement'
import type { CreateCheckoutInput } from '@/lib/payments/bachs/types'
import type { ResolvedDelivery } from '@/lib/courier/types'
import { parseDeliveryQuoteInput, type DeliveryQuoteInput } from './schema'
import { DELIVERY_PURPOSE, type DeliveryOrderStatus, type DeliveryOrderView } from './types'

// Supabase has no generated types for these service-only RPCs; keep the injectable adapter boundary local.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeliveryDB = { from(table: string): any; rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: any; error: any }> }
export type DeliveryRow = {
  id: string; order_id: string; member_id: string; quote_input: DeliveryQuoteInput & { email: string }
  resolved_delivery: ResolvedDelivery; amount_minor: number; currency: 'NGN'; expires_at: string
  status: DeliveryOrderStatus; reference: string; checkout_id: string | null; checkout_url: string | null
  checkout_expires_at: string | null; checkout_request: string | null; charge_id: string | null
  paid_at: string | null; waybill: string | null; tracking_url: string | null
}
export class DeliveryError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
function safeUrl(value: string | null): string | null {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null } catch { return null }
}
export function deliveryView(row: DeliveryRow): DeliveryOrderView {
  const input = row.quote_input
  return {
    id: row.id, status: row.status, amountMinor: Number(row.amount_minor), currency: row.currency, expiresAt: row.expires_at,
    recipientName: input.recipientName, phone: input.phone, addressLine1: input.addressLine1, addressLine2: input.addressLine2 ?? '',
    city: input.city, state: input.state, country: input.country, postalCode: input.postalCode ?? '',
    deliveryMode: row.resolved_delivery.mode, serviceCentreId: row.resolved_delivery.serviceCentreId,
    destination: row.resolved_delivery.formattedAddress || [input.addressLine1, input.city, input.state, input.country].filter(Boolean).join(', '),
    waybill: row.waybill, trackingUrl: safeUrl(row.tracking_url), paidAt: row.paid_at,
  }
}
function databaseError(error: { code?: string } | null) {
  if (error) throw new DeliveryError(error.code === 'P0001' ? 409 : 503,
    error.code === 'P0001' ? 'This delivery has changed or is not eligible for this action. Refresh to check its payment and delivery status.' : 'Delivery details are temporarily unavailable. Please try again shortly.')
}
async function rpc(db: DeliveryDB, name: string, args: Record<string, unknown>): Promise<DeliveryRow | null> {
  const result = await db.rpc(name, args); databaseError(result.error); return result.data
}
async function memberRow(memberId: string, db: DeliveryDB): Promise<DeliveryRow | null> {
  const { data, error } = await db.from('award_delivery_orders').select('*').eq('member_id', memberId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle()
  databaseError(error); return data
}
export async function readDelivery(memberId: string, db: DeliveryDB = createAdminClient()) {
  const row = await memberRow(memberId, db)
  return { delivery: row ? deliveryView(row) : null }
}
async function requirePaidAward(memberId: string) {
  const payment = await getAwardPaymentView(memberId)
  if (payment.status !== 'paid' || !payment.confirmedPayment) throw new DeliveryError(409, 'Confirm your award fee payment before arranging delivery.')
}
function validateResolved(delivery: ResolvedDelivery) {
  if (!Number.isSafeInteger(delivery.stationId) || delivery.stationId <= 0 || !isNigerianCoordinate(delivery.latitude, delivery.longitude))
    throw new DeliveryError(502, 'GIG could not verify the delivery destination. Please try again.')
}
export async function saveDeliveryQuote(member: { id: string; email?: string | null }, body: unknown, db: DeliveryDB = createAdminClient()) {
  let input: DeliveryQuoteInput
  try { input = parseDeliveryQuoteInput(body) }
  catch (error) { throw new DeliveryError(400, error instanceof Error && !('issues' in error) ? error.message : 'Check the recipient, phone and delivery address.') }
  if (!member.email) throw new DeliveryError(409, 'Your account needs an email address before arranging delivery.')
  await requirePaidAward(member.id)
  const current = await memberRow(member.id, db)
  if (current && !['quoted', 'expired'].includes(current.status)) throw new DeliveryError(409, 'Check your existing delivery payment or shipment before changing the destination.')
  const courier = getCourier()
  if (courier.name !== 'gig') throw new DeliveryError(503, 'GIG delivery is temporarily unavailable.')
  const quote = await courier.quote(input)
  if (!quote.ok) throw new DeliveryError(quote.code === 'carrier_error' ? 502 : 422, quote.reason)
  if (!Number.isSafeInteger(quote.shippingKobo) || quote.shippingKobo <= 0 || (quote.currency && quote.currency !== 'NGN')) throw new DeliveryError(502, 'GIG did not return a valid naira delivery price.')
  validateResolved(quote.delivery)
  const row = await rpc(db, 'save_award_delivery_quote', { p_member: member.id, p_input: { ...input, email: member.email }, p_delivery: quote.delivery, p_amount: quote.shippingKobo, p_carrier: quote.raw })
  if (!row) throw new DeliveryError(503, 'Your delivery quote could not be saved. Please try again.')
  return { delivery: deliveryView(row), quote: { amountMinor: Number(row.amount_minor), currency: 'NGN' as const, deliveryMode: row.resolved_delivery.mode, destination: row.resolved_delivery.formattedAddress } }
}
function checkoutInput(row: DeliveryRow): CreateCheckoutInput {
  return {
    orderId: row.id, attemptId: row.id, reference: row.reference, idempotencyKey: `award-delivery-${row.id}`, currency: 'NGN',
    purpose: DELIVERY_PURPOSE, deliveryAmountMinor: Number(row.amount_minor),
    customer: { email: row.quote_input.email, name: row.quote_input.recipientName, phoneNumber: row.quote_input.phone },
    successPath: '/dashboard/me/award/delivery?deliveryPayment=done', cancelPath: '/dashboard/me/award/delivery?deliveryPayment=cancelled',
    recover: true,
  }
}
function verifiedCheckoutUrl(row: DeliveryRow) {
  const url = safeUrl(row.checkout_url)
  if (!url || !bachsConfig().checkoutHosts.has(new URL(url).hostname)) throw new DeliveryError(503, 'The delivery payment link is unavailable. Check payment status before trying again.')
  return url
}
export async function startDeliveryCheckout(memberId: string, deliveryId: string, db: DeliveryDB = createAdminClient()) {
  if (process.env.AWARD_DELIVERY_CHECKOUT_ENABLED !== 'true') throw new DeliveryError(503, 'Delivery payment is temporarily unavailable. Please try again shortly.')
  const config = bachsConfig()
  if (!config.awardWebhookSecret || !config.organizationId) throw new DeliveryError(503, 'Delivery payment confirmation is not configured.')
  if (getCourier().name !== 'gig' || !process.env.GIG_SENDER_NAME?.trim() || !process.env.GIG_SENDER_PHONE?.trim() || !process.env.GIG_SENDER_ADDRESS?.trim())
    throw new DeliveryError(503, 'Courier pickup is temporarily unavailable. Please try again before paying.')
  await requirePaidAward(memberId)
  const reserved = await rpc(db, 'reserve_award_delivery_checkout', { p_member: memberId, p_delivery_id: deliveryId })
  if (!reserved || reserved.member_id !== memberId) throw new DeliveryError(404, 'Delivery quote not found.')
  let row: DeliveryRow = reserved
  if (row.status === 'open' && row.checkout_id) {
    row = await reconcileDeliveryRow(row, db)
    if (row.status !== 'open') return { status: row.status }
    return { checkoutUrl: verifiedCheckoutUrl(row), status: row.status }
  }
  if (row.status !== 'creating') throw new DeliveryError(409, 'This delivery is already paid or being processed. Refresh this page.')
  const input = checkoutInput(row)
  const proposed = JSON.stringify(buildCheckoutRequest({ ...input, config }))
  if (!row.checkout_request) {
    const saved = await db.from('award_delivery_orders').update({ checkout_request: proposed }).eq('id', row.id).eq('status', 'creating').is('checkout_request', null).select('*').maybeSingle()
    databaseError(saved.error)
    if (saved.data) row = saved.data
    else {
      const again = await db.from('award_delivery_orders').select('*').eq('id', row.id).eq('member_id', memberId).maybeSingle()
      databaseError(again.error); if (!again.data?.checkout_request) throw new DeliveryError(503, 'Delivery checkout is being prepared. Check again shortly.')
      row = again.data
    }
  }
  let session
  try { session = await createCheckoutSession({ ...input, config, requestBody: row.checkout_request ?? undefined }, { maxAttempts: 2 }) }
  catch (error) {
    // Only an explicit rejection proves that no hosted session exists. Unknown
    // outcomes retain the same immutable body/reference/key for recovery.
    if (isDefinitiveNoSessionError(error)) {
      const failed = await db.from('award_delivery_orders').update({ status: 'expired' }).eq('id', row.id).eq('status', 'creating').is('checkout_id', null)
      databaseError(failed.error)
    }
    throw new DeliveryError(502, 'Delivery checkout could not be opened. Check payment status before trying again.')
  }
  const bound = await rpc(db, 'bind_award_delivery_checkout', { p_id: row.id, p_checkout_id: session.checkoutId, p_url: session.checkoutUrl, p_expires: session.expiresAt, p_status: session.status })
  if (!bound) throw new DeliveryError(503, 'Your payment link could not be saved. Check status before trying again.')
  if (!['creating', 'open'].includes(bound.status)) return { status: bound.status }
  if (session.status !== 'open') {
    const reconciled = await reconcileDeliveryRow(bound, db)
    return { status: reconciled.status }
  }
  return { checkoutUrl: verifiedCheckoutUrl(bound), status: bound.status }
}

export async function dispatchPaidDelivery(row: DeliveryRow, db: DeliveryDB): Promise<DeliveryRow> {
  if (row.status !== 'paid') return row
  // Claim is durable and cannot expire into another automatic booking. Once a
  // request may have reached GIG, only staff can resolve an uncertain outcome.
  const claimed = await rpc(db, 'claim_award_delivery_dispatch', { p_id: row.id })
  if (!claimed) return row
  if (claimed.status !== 'booking') return claimed
  const courier = getCourier()
  if (courier.name !== 'gig') {
    const result = await db.from('award_delivery_orders').update({ status: 'needs_review', booking_response: { reason: 'GIG courier configuration is unavailable. No booking was attempted.' } }).eq('id', claimed.id).eq('status', 'booking')
    databaseError(result.error)
    return { ...claimed, status: 'needs_review' }
  }
  let acceptedBooking: { waybill: string; trackingUrl: string | null; raw: unknown } | null = null
  try {
    validateResolved(claimed.resolved_delivery)
    const booking = await courier.book({ ...claimed.quote_input, orderId: claimed.id, email: claimed.quote_input.email, quotedDelivery: claimed.resolved_delivery, deliveryMode: claimed.resolved_delivery.mode, serviceCentreId: claimed.resolved_delivery.serviceCentreId })
    acceptedBooking = booking
    if (!booking.waybill?.trim()) throw new Error('No carrier waybill')
    const finished = await rpc(db, 'finish_award_delivery_dispatch', { p_id: claimed.id, p_waybill: booking.waybill, p_url: safeUrl(booking.trackingUrl), p_response: booking.raw })
    if (!finished) throw new Error('Could not record waybill')
    return finished
  } catch {
    // No automatic retry here: an HTTP timeout can still have booked a parcel.
    const result = await db.from('award_delivery_orders').update({ status: 'needs_review', booking_response: acceptedBooking
      ? { reason: 'Carrier accepted booking but the waybill could not be finalized.', waybill: acceptedBooking.waybill, tracking_url: safeUrl(acceptedBooking.trackingUrl), carrier: acceptedBooking.raw }
      : { reason: 'Carrier booking outcome is uncertain. Check GIG before attempting any further booking.', reference: claimed.id },
    }).eq('id', claimed.id).eq('status', 'booking')
    databaseError(result.error)
    return { ...claimed, status: 'needs_review' }
  }
}
export async function reconcileDeliveryRow(row: DeliveryRow, db: DeliveryDB): Promise<DeliveryRow> {
  if (['dispatched', 'booking', 'needs_review'].includes(row.status)) return row
  if (row.status === 'paid') return dispatchPaidDelivery(row, db)
  if (!row.checkout_id) return row
  const verified = await verifyBachsAwardCheckout({ checkoutId: row.checkout_id, reference: row.reference, orderId: row.id, attemptId: row.id, currency: 'NGN', requestedMinor: Number(row.amount_minor), purpose: DELIVERY_PURPOSE }, bachsConfig())
  if (!verified) {
    // Verification also returns null for processing/underpaid charge shapes.
    // Keep the same checkout recoverable until definitive provider evidence is
    // available; never issue another payment link or infer paid from the event.
    throw new DeliveryError(409, 'Your delivery payment could not be confirmed. Please contact the team before paying again.')
  }
  const settled = await rpc(db, 'settle_award_delivery_checkout', { p_id: row.id, p_checkout: {
    checkout_id: row.checkout_id, reference: row.reference, purpose: DELIVERY_PURPOSE, status: verified.status, currency: verified.currency, amount_minor: verified.amountMinor, charge_id: verified.chargeId, charge_currency: verified.chargeCurrency, gross_amount: verified.grossAmount,
  } })
  if (!settled) throw new DeliveryError(503, 'Delivery payment confirmation could not be saved.')
  return dispatchPaidDelivery(settled, db)
}
export async function reconcileMemberDelivery(memberId: string, db: DeliveryDB = createAdminClient()) {
  let row = await memberRow(memberId, db)
  if (row?.status === 'creating' && !row.checkout_id) {
    await startDeliveryCheckout(memberId, row.id, db)
    row = await memberRow(memberId, db)
  }
  if (row) await reconcileDeliveryRow(row, db)
  return readDelivery(memberId, db)
}
