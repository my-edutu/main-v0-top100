import { describe, it, expect } from 'vitest'
import {
  assertTransition,
  canTransition,
  isPaid,
  needsClaim,
  type AwardStatus,
} from '@/lib/awards/status'

describe('canTransition', () => {
  it('allows a fresh order to be quoted', () => {
    expect(canTransition('draft', 'quoted')).toBe(true)
  })

  it('allows a re-quote of an already quoted order', () => {
    expect(canTransition('quoted', 'quoted')).toBe(true)
  })

  it('allows a quoted order to move to checkout', () => {
    expect(canTransition('quoted', 'awaiting_payment')).toBe(true)
  })

  it('allows payment confirmation', () => {
    expect(canTransition('awaiting_payment', 'paid')).toBe(true)
  })

  it('allows dispatch after payment', () => {
    expect(canTransition('paid', 'dispatched')).toBe(true)
  })

  it('refuses to dispatch an unpaid order', () => {
    expect(canTransition('quoted', 'dispatched')).toBe(false)
    expect(canTransition('awaiting_payment', 'dispatched')).toBe(false)
    expect(canTransition('draft', 'dispatched')).toBe(false)
  })

  it('refuses to mark an order paid without going through checkout', () => {
    expect(canTransition('draft', 'paid')).toBe(false)
    expect(canTransition('quoted', 'paid')).toBe(false)
  })

  it('treats delivered and cancelled as terminal', () => {
    const terminals: AwardStatus[] = ['delivered', 'cancelled']
    const targets: AwardStatus[] = ['draft', 'quoted', 'paid', 'dispatched', 'in_transit', 'delivered']
    for (const from of terminals) {
      for (const to of targets) {
        expect(canTransition(from, to)).toBe(false)
      }
    }
  })

  it('lets a failed quote be retried', () => {
    expect(canTransition('quote_failed', 'quoted')).toBe(true)
  })
})

describe('assertTransition', () => {
  it('is silent on a legal transition', () => {
    expect(() => assertTransition('paid', 'dispatched')).not.toThrow()
  })

  it('throws naming both states on an illegal transition', () => {
    expect(() => assertTransition('draft', 'dispatched')).toThrow(/draft.*dispatched/)
  })
})

describe('isPaid', () => {
  it('is true from paid onwards', () => {
    expect(isPaid('paid')).toBe(true)
    expect(isPaid('dispatched')).toBe(true)
    expect(isPaid('in_transit')).toBe(true)
    expect(isPaid('delivered')).toBe(true)
  })

  it('is false before payment', () => {
    expect(isPaid('draft')).toBe(false)
    expect(isPaid('quoted')).toBe(false)
    expect(isPaid('awaiting_payment')).toBe(false)
    expect(isPaid('quote_failed')).toBe(false)
  })
})

describe('needsClaim', () => {
  it('prompts a member with no order at all', () => {
    expect(needsClaim(null)).toBe(true)
  })

  it('prompts a member who started but has not paid', () => {
    expect(needsClaim('draft')).toBe(true)
    expect(needsClaim('quoted')).toBe(true)
    expect(needsClaim('awaiting_payment')).toBe(true)
  })

  it('stops prompting once paid', () => {
    expect(needsClaim('paid')).toBe(false)
    expect(needsClaim('delivered')).toBe(false)
  })

  it('stops prompting a cancelled order', () => {
    expect(needsClaim('cancelled')).toBe(false)
  })
})
