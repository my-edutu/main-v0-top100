import { afterEach, describe, expect, it, vi } from 'vitest'

import { bachsConfig } from '@/lib/payments/bachs/config'
import {
  BachsCheckoutError,
  buildCheckoutRequest,
  createCheckoutSession,
  isDefinitiveNoSessionError,
  type CreateCheckoutInput,
} from '@/lib/payments/bachs/checkout'

const config = bachsConfig({
  NODE_ENV: 'test',
  BACHS_API_KEY: 'sk_sandbox_test-key',
  BACHS_API_BASE_URL: 'https://sandbox-api.bachs.io',
  BACHS_WEBHOOK_SECRET: 'webhook-secret',
  BACHS_CHECKOUT_HOSTS: 'checkout.bachs.io',
  NEXT_PUBLIC_SITE_URL: 'https://top100afl.com',
})

const ngnInput: CreateCheckoutInput = {
  orderId: 'order-123',
  attemptId: 'attempt-123',
  idempotencyKey: 'checkout_attempt-123',
  reference: 'AFL-AWARD-order-123-attempt-123',
  currency: 'NGN',
  customer: { email: 'member@example.com', name: 'Member Name', phoneNumber: '+2348012345678' },
  config,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildCheckoutRequest', () => {
  it('builds the server-owned NGN payload with exact pricing', () => {
    expect(buildCheckoutRequest(ngnInput)).toEqual({
      pricing: { currency: 'USD', amount: '20.00', currency_options: { NGN: '25000.00' } },
      billing_currency: 'NGN',
      customer: { email: 'member@example.com', name: 'Member Name', phone_number: '+2348012345678' },
      reference: ngnInput.reference,
      metadata: {
        order_id: ngnInput.orderId,
        payment_attempt_id: ngnInput.attemptId,
        purpose: 'afl_award_fee_v1',
      },
      success_url: 'https://top100afl.com/dashboard/me/award?payment=done',
      cancel_url: 'https://top100afl.com/dashboard/me/award?payment=cancelled',
      expires_in_minutes: 60,
    })
  })

  it('uses the USD billing currency while keeping the same base and override prices', () => {
    const request = buildCheckoutRequest({ ...ngnInput, currency: 'USD' })
    expect(request.billing_currency).toBe('USD')
    expect(request.pricing).toEqual({ currency: 'USD', amount: '20.00', currency_options: { NGN: '25000.00' } })
  })

  it('does not include shipping, address, courier, or client amount fields', () => {
    const serialized = JSON.stringify(buildCheckoutRequest({ ...ngnInput, address: 'secret', shippingAmount: 1, gig: 'GIG', clientAmount: 1 } as CreateCheckoutInput & Record<string, unknown>))
    expect(serialized).not.toMatch(/address|shipping|gig|clientAmount/i)
  })
})

describe('createCheckoutSession', () => {
  const responseBody = {
    checkout_id: 'chk_123',
    checkout_url: 'https://checkout.bachs.io/c/token',
    status: 'open',
    created_at: '2026-09-08T10:00:00.000Z',
    expires_at: '2026-09-08T11:00:00.000Z',
    reference: ngnInput.reference,
  }

  it('creates and validates a hosted checkout response', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseBody), { status: 201 }))
    const result = await createCheckoutSession(ngnInput, { fetcher, now: () => new Date('2026-09-08T10:01:00.000Z'), sleep: async () => undefined })

    expect(result).toMatchObject({ checkoutId: 'chk_123', checkoutUrl: responseBody.checkout_url, status: 'open' })
    expect(fetcher).toHaveBeenCalledTimes(1)
    const [, init] = fetcher.mock.calls[0]
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer sk_sandbox_test-key',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Idempotency-Key': ngnInput.idempotencyKey,
    })
    expect(init.body).toBe(JSON.stringify(buildCheckoutRequest(ngnInput)))
  })

  it('retries 429 and 5xx with the same body and idempotency key', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429, headers: { 'Retry-After': '1' } }))
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(responseBody), { status: 201 }))
    const sleep = vi.fn().mockResolvedValue(undefined)

    await createCheckoutSession(ngnInput, { fetcher, sleep, now: () => new Date('2026-09-08T10:01:00.000Z') })

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(sleep).toHaveBeenCalledWith(1_000)
    expect(fetcher.mock.calls.map(([, init]) => init.body)).toEqual([initBody(fetcher, 0), initBody(fetcher, 0), initBody(fetcher, 0)])
    expect(fetcher.mock.calls.map(([, init]) => init.headers['Idempotency-Key'])).toEqual([ngnInput.idempotencyKey, ngnInput.idempotencyKey, ngnInput.idempotencyKey])
  })

  it('does not retry validation or authentication failures', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"detail":"bad"}', { status: 400 }))
    await expect(createCheckoutSession(ngnInput, { fetcher, sleep: async () => undefined })).rejects.toThrow(/400|checkout/i)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('rejects timeout/network exhaustion and invalid hosted response data', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'))
    await expect(createCheckoutSession(ngnInput, { fetcher, timeoutMs: 50, sleep: async () => undefined })).rejects.toThrow(/network|failed|retry/i)
    expect(fetcher).toHaveBeenCalledTimes(3)

    for (const invalid of [
      { ...responseBody, checkout_id: '' },
      { ...responseBody, status: 'completed' },
      { ...responseBody, expires_at: '2026-09-08T09:00:00.000Z' },
      { ...responseBody, checkout_url: 'http://checkout.bachs.io/c/token' },
      { ...responseBody, checkout_url: 'https://checkout.bachs.io:8443/c/token' },
      { ...responseBody, checkout_url: 'https://evil.example/c/token' },
    ]) {
      const invalidFetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(invalid), { status: 201 }))
      await expect(createCheckoutSession(ngnInput, { fetcher: invalidFetcher, now: () => new Date('2026-09-08T10:01:00.000Z'), sleep: async () => undefined })).rejects.toThrow()
    }
  })

  it('enforces a bounded timeout even when a fetcher ignores AbortSignal', async () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => undefined))
    const result = await Promise.race([
      createCheckoutSession(ngnInput, { fetcher, timeoutMs: 5, maxAttempts: 1, sleep: async () => undefined }).then(() => 'resolved', () => 'rejected'),
      new Promise<'guard-fired'>((resolve) => setTimeout(() => resolve('guard-fired'), 100)),
    ])
    expect(result).not.toBe('guard-fired')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('keeps the timeout active while reading a response body', async () => {
    const hangingResponse = {
      ok: true,
      status: 201,
      headers: new Headers(),
      text: () => new Promise<string>(() => undefined),
    } as Response
    const fetcher = vi.fn().mockResolvedValue(hangingResponse)
    const result = await Promise.race([
      createCheckoutSession(ngnInput, { fetcher, timeoutMs: 5, maxAttempts: 1, sleep: async () => undefined }).then(() => 'resolved', () => 'rejected'),
      new Promise<'guard-fired'>((resolve) => setTimeout(() => resolve('guard-fired'), 100)),
    ])
    expect(result).not.toBe('guard-fired')
  })
})

describe('Bachs checkout failure classification', () => {
  it.each([400, 401, 403, 404, 405, 422])('marks HTTP %s as a definitive no-session rejection', (status) => {
    expect(isDefinitiveNoSessionError(new BachsCheckoutError(`HTTP ${status}`, status, false))).toBe(true)
  })

  it.each([408, 409, 429, 500])('keeps HTTP %s uncertain or retryable', (status) => {
    expect(isDefinitiveNoSessionError(new BachsCheckoutError(`HTTP ${status}`, status, status >= 500 || status === 429))).toBe(false)
  })

  it('does not classify malformed, network, or provider-less failures as no-session', () => {
    expect(isDefinitiveNoSessionError(new BachsCheckoutError('invalid response', null, false))).toBe(false)
    expect(isDefinitiveNoSessionError(new Error('network timeout'))).toBe(false)
  })
})

function initBody(fetcher: ReturnType<typeof vi.fn>, index: number) {
  return fetcher.mock.calls[index][1].body
}
