import crypto from 'node:crypto'
import { describe, it, expect } from 'vitest'
import { buildReference, paidAmountMatches, verifyPaystackSignature } from '@/lib/payments/paystack'

const SECRET = 'sk_test_example_secret'
const BODY = JSON.stringify({
  event: 'charge.success',
  data: { reference: 'AFL-AWARD-abc', amount: 2_350_000 },
})

function sign(body: string, secret = SECRET): string {
  return crypto.createHmac('sha512', secret).update(body, 'utf8').digest('hex')
}

describe('verifyPaystackSignature', () => {
  it('accepts a correctly signed body', () => {
    expect(verifyPaystackSignature(BODY, sign(BODY), SECRET)).toBe(true)
  })

  it('rejects a body signed with a different secret', () => {
    expect(verifyPaystackSignature(BODY, sign(BODY, 'sk_test_attacker'), SECRET)).toBe(false)
  })

  it('rejects a tampered body carrying a valid signature for other content', () => {
    const tampered = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'AFL-AWARD-abc', amount: 100 },
    })
    expect(verifyPaystackSignature(tampered, sign(BODY), SECRET)).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(verifyPaystackSignature(BODY, null, SECRET)).toBe(false)
  })

  it('rejects a short signature without throwing', () => {
    expect(verifyPaystackSignature(BODY, 'abc', SECRET)).toBe(false)
  })

  it('rejects an empty signature', () => {
    expect(verifyPaystackSignature(BODY, '', SECRET)).toBe(false)
  })
})

describe('paidAmountMatches', () => {
  it('accepts the exact expected amount', () => {
    expect(paidAmountMatches(2_350_000, 2_350_000)).toBe(true)
  })

  it('rejects an underpayment', () => {
    expect(paidAmountMatches(100, 2_350_000)).toBe(false)
  })

  it('rejects an underpayment that is one kobo short', () => {
    expect(paidAmountMatches(2_349_999, 2_350_000)).toBe(false)
  })

  it('accepts an overpayment', () => {
    expect(paidAmountMatches(2_400_000, 2_350_000)).toBe(true)
  })

  it('rejects a non-integer paid amount', () => {
    expect(paidAmountMatches(2_350_000.5, 2_350_000)).toBe(false)
  })
})

describe('buildReference', () => {
  it('namespaces the reference with the order id', () => {
    expect(buildReference('0f8f-1234')).toMatch(/^AFL-AWARD-0f8f-1234$/)
  })
})
