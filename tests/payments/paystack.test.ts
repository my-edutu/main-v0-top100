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

  it('rejects an empty secret, even when the body is "signed" with the same empty secret', () => {
    expect(verifyPaystackSignature(BODY, sign(BODY, ''), '')).toBe(false)
  })

  it('rejects a same-length non-hex signature instead of truncating it as hex', () => {
    // A correctly-hex signature is 128 chars (SHA-512 digest as hex). Swap the
    // first char for a non-hex one: Buffer.from(sig, 'hex') would silently stop
    // parsing there and produce a short, wrong buffer instead of failing length
    // comparison, so this only stays rejected while comparison treats the
    // signature as UTF-8 text rather than hex.
    const validSignature = sign(BODY)
    const nonHexSameLength = `z${validSignature.slice(1)}`
    expect(nonHexSameLength).toHaveLength(128)
    expect(verifyPaystackSignature(BODY, nonHexSameLength, SECRET)).toBe(false)
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

  it('returns exactly AFL-AWARD-<orderId> when no suffix is given', () => {
    expect(buildReference('0f8f-1234')).toBe('AFL-AWARD-0f8f-1234')
  })

  it('appends a uniqueness suffix when one is given, keeping the order id recoverable', () => {
    expect(buildReference('0f8f-1234', 'abc123')).toBe('AFL-AWARD-0f8f-1234-abc123')
  })

  it('produces different references for the same order id with different suffixes', () => {
    const first = buildReference('0f8f-1234', 'aaa')
    const second = buildReference('0f8f-1234', 'bbb')
    expect(first).not.toBe(second)
  })
})
