import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { verifyBachsSignature } from '@/lib/payments/bachs/signature'

const secret = 'webhook-secret'
const rawBody = '{"id":"evt_123","type":"collection.succeeded"}'
const now = 1_800_000_000

function sign(body: string, timestamp: number) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')
}

describe('verifyBachsSignature', () => {
  it('accepts the signed raw body within the timestamp tolerance', () => {
    expect(verifyBachsSignature({ rawBody, timestampHeader: String(now), signatureHeader: sign(rawBody, now), secret, nowSeconds: now })).toBe(true)
  })

  it('rejects a tampered body, wrong secret, stale timestamp, and malformed signature', () => {
    expect(verifyBachsSignature({ rawBody: `${rawBody} `, timestampHeader: String(now), signatureHeader: sign(rawBody, now), secret, nowSeconds: now })).toBe(false)
    expect(verifyBachsSignature({ rawBody, timestampHeader: String(now), signatureHeader: sign(rawBody, now), secret: 'other-secret', nowSeconds: now })).toBe(false)
    expect(verifyBachsSignature({ rawBody, timestampHeader: String(now - 301), signatureHeader: sign(rawBody, now - 301), secret, nowSeconds: now })).toBe(false)
    expect(verifyBachsSignature({ rawBody, timestampHeader: String(now + 301), signatureHeader: sign(rawBody, now + 301), secret, nowSeconds: now })).toBe(false)
    expect(verifyBachsSignature({ rawBody, timestampHeader: String(now), signatureHeader: sign(rawBody, now).toUpperCase(), secret, nowSeconds: now })).toBe(false)
    expect(verifyBachsSignature({ rawBody, timestampHeader: String(now), signatureHeader: 'abc', secret, nowSeconds: now })).toBe(false)
    expect(verifyBachsSignature({ rawBody, timestampHeader: 'not-a-timestamp', signatureHeader: sign(rawBody, now), secret, nowSeconds: now })).toBe(false)
  })

  it('signs raw bytes without reserializing them', () => {
    const bytes = new TextEncoder().encode(rawBody)
    expect(verifyBachsSignature({ rawBody: bytes, timestampHeader: String(now), signatureHeader: sign(rawBody, now), secret, nowSeconds: now })).toBe(true)
  })
})
