import { describe, expect, it } from 'vitest'

import { isBachsTerminalSuccess, parseBachsEvent } from '@/lib/payments/bachs/events'

const validCollectionSucceeded = {
  id: 'evt_123',
  type: 'collection.succeeded',
  created_at: '2026-09-08T10:00:00.000Z',
  organization_id: 'acct_test',
  data: {
    checkout_id: 'chk_123',
    reference: 'AFL-AWARD-order-attempt',
    metadata: { order_id: 'order', payment_attempt_id: 'attempt', purpose: 'afl_award_fee_v1' },
    status: 'succeeded',
    amount: '20.00',
    currency: 'USD',
    charge_id: 'ch_123',
  },
}

describe('parseBachsEvent', () => {
  it('validates a collection succeeded envelope', () => {
    const event = parseBachsEvent(validCollectionSucceeded)
    expect(event.id).toBe('evt_123')
    expect(event.type).toBe('collection.succeeded')
    expect(event.data.checkout_id).toBe('chk_123')
    expect(event.data.metadata?.purpose).toBe('afl_award_fee_v1')
  })

  it('rejects malformed envelopes and success data without payment evidence', () => {
    expect(() => parseBachsEvent({ type: 'collection.succeeded', data: {} })).toThrow()
    expect(() => parseBachsEvent({ ...validCollectionSucceeded, id: '' })).toThrow()
    expect(() => parseBachsEvent({ ...validCollectionSucceeded, created_at: 'tomorrow' })).toThrow()
    expect(() => parseBachsEvent({ ...validCollectionSucceeded, data: { ...validCollectionSucceeded.data, amount: 20 } })).toThrow()
    expect(() => parseBachsEvent({ ...validCollectionSucceeded, data: { ...validCollectionSucceeded.data, metadata: [] } })).toThrow()
  })

  it('accepts non-success lifecycle events with a checkout identity', () => {
    const event = parseBachsEvent({
      ...validCollectionSucceeded,
      type: 'checkout.expired',
      data: { checkout_id: 'chk_123' },
    })
    expect(event.type).toBe('checkout.expired')
  })
})

describe('isBachsTerminalSuccess', () => {
  it.each(['SUCCEEDED', 'succeeded', 'ACCEPTED', 'accepted'])('accepts %s', (status) => {
    expect(isBachsTerminalSuccess(status)).toBe(true)
  })

  it.each(['CREATED', 'PROCESSING', 'FAILED', 'UNDERPAID', 'OVERPAID', '', null, undefined])('rejects %s', (status) => {
    expect(isBachsTerminalSuccess(status)).toBe(false)
  })
})
