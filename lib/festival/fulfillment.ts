import { mapPaymentView, type PaymentAttemptRow } from '@/lib/awards/payment-state'
import type { FestivalContact, FestivalDispatch } from './interest'

export const fulfillmentQueues = ['pickup', 'dispatch-paid', 'dispatch-pending', 'review'] as const
export type FulfillmentQueue = (typeof fulfillmentQueues)[number]

export type FulfillmentOrder = NonNullable<Parameters<typeof mapPaymentView>[0]> & {
  id: string
  profile_id: string | null
  awardee_id: string | null
  recipient_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  country: string | null
  gig_waybill: string | null
}
type DeliveryCharge = { amount: string; currency: string }

type Contact = { full_name: string | null; email: string | null; phone: string | null }
type FulfillmentResponse = {
  member_id: string
  attending: boolean | null
  pickup: string
  pickup_delegate: Pick<FestivalContact, 'name' | 'phone'> | null
  dispatch: FestivalDispatch | null
  awardee_name: string | null
  awardee_email: string | null
  awardee_phone: string | null
}
type Ticket = {
  member_id: string
  registered_at: string | null
  pickup_requested: boolean
  ticket_id: string | null
  full_name: string
  phone: string
}
export type FulfillmentDelivery = {
  id: string
  order_id: string
  member_id: string
  status: string
  verified: boolean
  possiblePayment: boolean
  recipient: string
  phone: string
  city: string
  region: string
  country: string
  charge: DeliveryCharge | null
  waybill: string | null
  paidAt: string | null
  expiresAt: string
  amountMinor: number
}
export type FulfillmentSources = {
  orders: FulfillmentOrder[]
  attempts: (PaymentAttemptRow & { order_id: string })[]
  profiles: (Contact & { id: string })[]
  awardees: (Contact & { id: string; profile_id: string | null })[]
  responses: FulfillmentResponse[]
  tickets: Ticket[]
  deliveries: FulfillmentDelivery[]
  unmatchedReceipts: { email: string | null }[]
}
export type FulfillmentRecord = {
  memberId: string
  name: string
  email: string
  phone: string
  queue: FulfillmentQueue
  status: string
  awardPaidAt: string | null
  shippingPaidAt: string | null
  orderId: string | null
  ticketId: string | null
  collectorName: string
  collectorPhone: string
  recipientName: string
  recipientPhone: string
  destination: string
  waybill: string | null
  shippingAmountMinor: number | null
  shippingCharge: DeliveryCharge | null
}
export type FulfillmentRoster = {
  checkedAt: string
  awardPaid: number
  unmatchedReceipts: number
  records: FulfillmentRecord[]
}

function groupBy<Item>(items: Item[], key: (item: Item) => string) {
  const groups = new Map<string, Item[]>()
  for (const item of items) {
    const id = key(item)
    const group = groups.get(id)
    if (group) group.push(item)
    else groups.set(id, [item])
  }
  return groups
}

const emailKey = (email?: string | null) => email?.trim().toLowerCase() ?? ''
const historicalShipment = new Set(['dispatched', 'in_transit', 'delivered'])
const inactiveOrders = new Set(['cancelled', 'refunded'])

export function buildFulfillmentRoster(source: FulfillmentSources, now = new Date()): FulfillmentRoster {
  const { orders, awardees, profiles, responses, tickets, deliveries, attempts, unmatchedReceipts } = source
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))
  const awardeesById = new Map(awardees.map((awardee) => [awardee.id, awardee]))
  const memberForOrder = (order: FulfillmentOrder) =>
    order.profile_id || awardeesById.get(order.awardee_id ?? '')?.profile_id ||
    (order.awardee_id ? `awardee:${order.awardee_id}` : `order:${order.id}`)
  const ordersByMember = groupBy(orders, memberForOrder)
  const attemptsByOrder = groupBy(attempts, (attempt) => attempt.order_id)
  const deliveriesByMember = groupBy(deliveries, (delivery) => delivery.member_id)
  const responsesByMember = new Map(responses.map((response) => [response.member_id, response]))
  const ticketsByMember = new Map(tickets.filter((ticket) => ticket.registered_at).map((ticket) => [ticket.member_id, ticket]))
  const unmatchedEmails = new Set(unmatchedReceipts.map((receipt) => emailKey(receipt.email)).filter(Boolean))
  const candidates = new Set([
    ...ordersByMember.keys(), ...responsesByMember.keys(), ...ticketsByMember.keys(), ...deliveriesByMember.keys(),
  ])
  const records: FulfillmentRecord[] = []
  for (const memberId of candidates) {
    const memberOrders = ordersByMember.get(memberId) ?? []
    const activeOrders = memberOrders.filter((order) => !inactiveOrders.has(order.status ?? '') && order.award_payment_status !== 'refunded')
    const verifiedOrders = activeOrders.flatMap((order) => {
      const payment = mapPaymentView(order, attemptsByOrder.get(order.id) ?? [], []).confirmedPayment
      return payment ? [{ order, payment }] : []
    })
    const verifiedAward = verifiedOrders[0]
    const order = verifiedAward?.order ?? activeOrders[0] ?? memberOrders[0]
    const awardee = awardeesById.get(order?.awardee_id ?? '')
    const profile = profilesById.get(memberId)
    const rsvp = responsesByMember.get(memberId)
    const ticket = ticketsByMember.get(memberId)
    const memberDeliveries = deliveriesByMember.get(memberId) ?? []
    const activeDeliveries = memberDeliveries.filter((delivery) => !['quoted', 'expired'].includes(delivery.status) || delivery.possiblePayment)
    const delivery = activeDeliveries[0] ?? memberDeliveries[0]
    const dispatchAddress = rsvp?.dispatch
    const delegate = rsvp?.pickup === 'festival' ? rsvp.pickup_delegate : null
    const pickup = rsvp ? rsvp.pickup === 'festival' && (rsvp.attending === true || Boolean(delegate?.name && delegate?.phone)) : ticket?.pickup_requested === true
    const dispatch = rsvp ? rsvp.pickup === 'dispatch' : ticket?.pickup_requested === false
    const legacyShipping = verifiedAward && Boolean(order && mapPaymentView(order, [], []).confirmedPayment)
    const historicalWaybill = order?.gig_waybill
    const historicalDelivery = historicalShipment.has(order?.status ?? '') || Boolean(historicalWaybill)
    const paymentReview = [profile?.email, order?.email, rsvp?.awardee_email, awardee?.email]
      .some((email) => unmatchedEmails.has(emailKey(email)))

    if (!verifiedAward && !rsvp && !ticket && !delivery && !historicalDelivery && !paymentReview && order?.award_payment_status !== 'paid') continue

    let queue: FulfillmentQueue = 'review'
    let status: string
    if (!verifiedAward) {
      status = memberOrders.some((item) => item.status === 'refunded' || item.award_payment_status === 'refunded')
        ? 'Award fee refunded'
        : 'Award fee not verified'
    } else if (verifiedOrders.length > 1 || (order?.profile_id && awardee?.profile_id && order.profile_id !== awardee.profile_id)) {
      status = 'Conflicting award orders or member records'
    } else if (!profile) {
      status = 'Link the award order to a member'
    } else if (paymentReview) {
      status = 'Match the Bachs delivery payment'
    } else if (activeDeliveries.length > 1 || (delivery && delivery.order_id !== order?.id) || (legacyShipping && activeDeliveries.length)) {
      status = 'Conflicting delivery records'
    } else if (pickup && (activeDeliveries.length || legacyShipping || historicalDelivery)) {
      status = 'Check pickup against existing delivery'
    } else if ((delivery?.possiblePayment && !delivery.verified) || delivery?.status === 'needs_review' || (historicalDelivery && !legacyShipping && !delivery?.verified)) {
      status = 'Verify delivery evidence before fulfillment'
    } else if (delivery?.verified || legacyShipping) {
      queue = 'dispatch-paid'
      status = delivery?.waybill || historicalWaybill ? (order?.status === 'delivered' ? 'Delivered' : 'Waybill issued')
        : delivery?.status === 'booking' ? 'Courier booking in progress' : 'Awaiting waybill'
    } else if (pickup) {
      queue = 'pickup'
      status = delegate ? 'Pickup by named collector' : 'Pickup by awardee'
    } else if (dispatch || delivery) {
      queue = 'dispatch-pending'
      status = delivery && ['creating', 'open'].includes(delivery.status) ? 'Awaiting delivery payment'
        : delivery?.status === 'quoted' && Date.parse(delivery.expiresAt) > now.getTime() ? 'Quote available'
          : delivery?.status === 'expired' || delivery?.status === 'quoted' ? 'Updated quote needed'
            : dispatchAddress ? 'Delivery quote needed' : 'Delivery details or quote needed'
    } else {
      status = 'Awaiting pickup or dispatch choice'
    }

    const shipping = queue === 'pickup' && !activeDeliveries.length ? undefined : delivery
    const destination = shipping
      ? [shipping.city, shipping.region, shipping.country]
      : dispatchAddress ? [dispatchAddress.city, dispatchAddress.region, dispatchAddress.country]
        : legacyShipping ? [order?.city, order?.state, order?.country] : []
    records.push({
      memberId,
      name: rsvp?.awardee_name || profile?.full_name || ticket?.full_name || awardee?.full_name || order?.recipient_name || 'Awardee',
      email: rsvp?.awardee_email || profile?.email || order?.email || awardee?.email || '',
      phone: rsvp?.awardee_phone || ticket?.phone || profile?.phone || order?.phone || awardee?.phone || '',
      queue, status,
      awardPaidAt: verifiedAward?.payment.paidAt ?? null,
      shippingPaidAt: shipping?.verified ? shipping.paidAt : legacyShipping ? order?.paid_at ?? null : null,
      orderId: order?.id ?? null,
      ticketId: ticket?.ticket_id ?? null,
      collectorName: delegate?.name ?? '',
      collectorPhone: delegate?.phone ?? '',
      recipientName: shipping?.recipient || dispatchAddress?.recipient || (legacyShipping ? order?.recipient_name : null) || '',
      recipientPhone: shipping?.phone || dispatchAddress?.phone || (legacyShipping ? order?.phone : null) || '',
      destination: [...new Set(destination.map((part) => part?.trim()).filter(Boolean))].join(', '),
      waybill: shipping?.waybill || historicalWaybill || null,
      shippingAmountMinor: shipping?.amountMinor ?? null,
      shippingCharge: shipping?.verified ? shipping.charge : null,
    })
  }

  records.sort((first, second) => first.name.localeCompare(second.name, 'en-NG') || first.memberId.localeCompare(second.memberId))
  return {
    checkedAt: now.toISOString(),
    awardPaid: records.filter((record) => record.awardPaidAt).length,
    unmatchedReceipts: unmatchedReceipts.length,
    records,
  }
}
