import { describe, expect, it } from 'vitest'
import { buildFulfillmentRoster, type FulfillmentDelivery, type FulfillmentOrder, type FulfillmentSources } from '@/lib/festival/fulfillment'

const paidAt = '2026-11-25T10:00:00Z'
const now = new Date('2026-11-25T16:00:00Z')
const order: FulfillmentOrder = {
  id: 'order', profile_id: 'member', awardee_id: null, recipient_name: 'Amina Example', email: 'amina@example.org',
  phone: null, country: null, city: null, gig_waybill: null, status: 'paid', award_payment_status: 'paid',
  award_paid_attempt_id: 'attempt',
}
const delivery: FulfillmentDelivery = {
  id: 'delivery', order_id: 'order', member_id: 'member', status: 'paid', verified: true, possiblePayment: true,
  recipient: 'Amina Example', phone: '+2348031234567', city: 'Lagos', country: 'Nigeria', waybill: null,
  paidAt, amountMinor: 170_000, expiresAt: '2026-11-26T10:00:00Z',
}
const rsvp: FulfillmentSources['responses'][number] = {
  member_id: 'member', attending: true, pickup: 'festival', pickup_delegate: null, dispatch: null,
  awardee_name: 'Amina Example', awardee_email: 'amina@example.org', awardee_phone: null,
}
const ticket: FulfillmentSources['tickets'][number] = {
  member_id: 'member', registered_at: paidAt, pickup_requested: true, ticket_id: 'ticket',
  full_name: 'Amina Example', phone: '+2348031234567',
}
const sources: FulfillmentSources = {
  orders: [order],
  attempts: [{ id: 'attempt', order_id: 'order', provider: 'bachs', charge_scope: 'award_fee', status: 'succeeded',
    currency: 'NGN', requested_amount_minor: 1_700_000, captured_amount_minor: 1_700_000, confirmed_at: paidAt }],
  profiles: [{ id: 'member', full_name: 'Amina Example', email: 'amina@example.org', phone: null }],
  awardees: [], responses: [rsvp], tickets: [], deliveries: [], unmatchedReceipts: [],
}
const roster = (overrides: Partial<FulfillmentSources> = {}) => buildFulfillmentRoster({ ...sources, ...overrides }, now)

describe('festival fulfillment roster', () => {
  it('counts one verified awardee who will collect and keeps a named collector distinct', () => {
    expect(roster()).toMatchObject({ awardPaid: 1, records: [{ queue: 'pickup', status: 'Pickup by awardee' }] })
    expect(roster({ responses: [{ ...rsvp, attending: null, pickup_delegate: { name: 'Chioma Example', phone: '+2348123123456' } }] }))
      .toMatchObject({ records: [{ name: 'Amina Example', queue: 'pickup', collectorName: 'Chioma Example' }] })
  })

  it('holds pickup when the award fee ledger has missing, wrong-order or partial capture evidence', () => {
    const attempt = sources.attempts[0]
    for (const attempts of [[], [{ ...attempt, order_id: 'other' }], [{ ...attempt, captured_amount_minor: 1 }]]) {
      expect(roster({ attempts })).toMatchObject({ awardPaid: 0, records: [{ queue: 'review', status: 'Award fee not verified' }] })
    }
    expect(roster({ orders: [{ ...order, award_payment_status: 'refunded' }] }))
      .toMatchObject({ awardPaid: 0, records: [{ queue: 'review', status: 'Award fee refunded' }] })
  })

  it('uses earlier registered ticket choices only when no current response exists', () => {
    expect(roster({ responses: [], tickets: [ticket] })).toMatchObject({ records: [{ queue: 'pickup', ticketId: 'ticket' }] })
    expect(roster({ responses: [], tickets: [{ ...ticket, registered_at: null }] }))
      .toMatchObject({ records: [{ queue: 'review', status: 'Awaiting pickup or dispatch choice', ticketId: null }] })
    expect(roster({ responses: [{ ...rsvp, attending: null, pickup: 'dispatch' }], tickets: [ticket] }))
      .toMatchObject({ records: [{ queue: 'dispatch-pending' }] })
  })

  it('includes paid delivery without a response and shows whether a waybill already exists', () => {
    expect(roster({ responses: [], deliveries: [delivery] })).toMatchObject({
      awardPaid: 1, records: [{ queue: 'dispatch-paid', status: 'Awaiting waybill', shippingPaidAt: paidAt }],
    })
    expect(roster({ responses: [], deliveries: [{ ...delivery, status: 'dispatched', waybill: 'AWB1' }] }))
      .toMatchObject({ records: [{ queue: 'dispatch-paid', status: 'Waybill issued', waybill: 'AWB1' }] })
  })

  it('holds records for conflicting methods or an unverified shipping payment', () => {
    expect(roster({ deliveries: [delivery] })).toMatchObject({ records: [{ queue: 'review', status: 'Check pickup against existing delivery' }] })
    expect(roster({ responses: [], deliveries: [{ ...delivery, verified: false }] })).toMatchObject({
      records: [{ queue: 'review', status: 'Verify delivery evidence before fulfillment', shippingPaidAt: null }],
    })
    expect(roster({ responses: [], deliveries: [{ ...delivery, order_id: 'other' }] }))
      .toMatchObject({ records: [{ queue: 'review', status: 'Conflicting delivery records' }] })
  })

  it('holds unmatched receipts and distinguishes unpaid quotes from expired quotes', () => {
    const quote = { ...delivery, status: 'quoted', verified: false, possiblePayment: false, paidAt: null }
    expect(roster({ responses: [], deliveries: [quote] })).toMatchObject({ records: [{ queue: 'dispatch-pending', status: 'Quote available' }] })
    expect(roster({ responses: [], deliveries: [{ ...quote, expiresAt: paidAt }] }))
      .toMatchObject({ records: [{ queue: 'dispatch-pending', status: 'Updated quote needed' }] })
    expect(roster({ responses: [], deliveries: [quote], unmatchedReceipts: [{ email: ' AMINA@EXAMPLE.ORG ' }] }))
      .toMatchObject({ unmatchedReceipts: 1, records: [{ queue: 'review', status: 'Match the Bachs delivery payment' }] })
    expect(roster({ deliveries: [quote] })).toMatchObject({ records: [{ queue: 'pickup' }] })
  })

  it('reclassifies the same awardee when they switch to dispatch and the delivery payment is verified', () => {
    const response = { ...rsvp, attending: null, pickup: 'dispatch' }
    const reserved = { ...delivery, status: 'creating', verified: false, possiblePayment: false, paidAt: null }
    const snapshots = [
      roster(),
      roster({ responses: [response], deliveries: [reserved] }),
      roster({ responses: [response], deliveries: [delivery] }),
    ]
    expect(snapshots.map((snapshot) => snapshot.records.map((record) => [record.memberId, record.queue]))).toEqual([
      [['member', 'pickup']], [['member', 'dispatch-pending']], [['member', 'dispatch-paid']],
    ])
    expect(snapshots.map((snapshot) => snapshot.awardPaid)).toEqual([1, 1, 1])
  })

  it('does not request delivery fees again for legacy combined payments', () => {
    expect(roster({ responses: [], attempts: [], orders: [{
      ...order, award_paid_attempt_id: null, paid_at: paidAt, paystack_reference: 'verified', paystack_status: 'success',
    }] })).toMatchObject({ records: [{ queue: 'dispatch-paid', shippingPaidAt: paidAt }] })
  })
})
