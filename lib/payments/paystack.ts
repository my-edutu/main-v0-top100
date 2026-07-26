// lib/payments/paystack.ts
// Paystack integration. Server-only: this module reads PAYSTACK_SECRET_KEY and
// must never be imported into a client component.
import crypto from 'node:crypto'

import { assertKobo } from '@/lib/awards/money'

const PAYSTACK_API = 'https://api.paystack.co'

export type InitInput = {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}

export type InitResult = {
  authorizationUrl: string
  accessCode: string
  reference: string
}

/** Deterministic reference so a retried checkout reuses one Paystack transaction. */
export function buildReference(orderId: string): string {
  return `AFL-AWARD-${orderId}`
}

/**
 * Verify Paystack's x-paystack-signature: HMAC-SHA512 of the RAW request body
 * using the secret key. The caller must pass the exact bytes received —
 * re-serialising parsed JSON changes the payload and breaks verification.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature || !secret) return false

  const expected = crypto.createHmac('sha512', secret).update(rawBody, 'utf8').digest('hex')
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const providedBuffer = Buffer.from(signature, 'utf8')

  // timingSafeEqual throws on a length mismatch, so check length first. Length
  // is not secret — the digest length is fixed and public.
  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

/**
 * Whether the amount Paystack reports covers what we expected to charge.
 * Overpayment is accepted; underpayment never is.
 */
export function paidAmountMatches(paidKobo: number, expectedKobo: number): boolean {
  if (!Number.isInteger(paidKobo) || !Number.isInteger(expectedKobo)) return false
  return paidKobo >= expectedKobo
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured')
  return key
}

/** Initialise a Paystack transaction and return its hosted checkout URL. */
export async function initializeTransaction(input: InitInput): Promise<InitResult> {
  assertKobo(input.amountKobo, 'charge amount')

  const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
      currency: 'NGN',
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message || 'Could not start the payment. Please try again.')
  }

  const { authorization_url, access_code, reference } = payload.data ?? {}
  if (
    typeof authorization_url !== 'string' ||
    typeof access_code !== 'string' ||
    typeof reference !== 'string'
  ) {
    throw new Error(payload?.message || 'Could not start the payment. Please try again.')
  }

  return {
    authorizationUrl: authorization_url,
    accessCode: access_code,
    reference,
  }
}

/** Server-side confirmation, used as a fallback when the webhook is delayed. */
export async function verifyTransaction(reference: string): Promise<{
  status: string
  amountKobo: number
}> {
  const response = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.status) {
    throw new Error(payload?.message || 'Could not verify the payment.')
  }

  const { status, amount } = payload.data ?? {}
  if (typeof status !== 'string' || typeof amount !== 'number') {
    throw new Error(payload?.message || 'Could not verify the payment.')
  }

  return { status, amountKobo: amount }
}
