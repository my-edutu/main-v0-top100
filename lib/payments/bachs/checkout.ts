import { bachsConfig } from './config'
import {
  BACHS_AWARD_CANCEL_PATH,
  BACHS_AWARD_SUCCESS_PATH,
  type BachsCheckoutRequest,
  type BachsCheckoutResponse,
  type BachsCheckoutSession,
  type BachsConfig,
  type CreateCheckoutInput,
} from './types'
import { awardFee } from './money'

export type { BachsCheckoutRequest, BachsCheckoutSession, CreateCheckoutInput }

export type CheckoutFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export type CreateCheckoutOptions = {
  config?: BachsConfig
  fetcher?: CheckoutFetcher
  fetch?: CheckoutFetcher
  timeoutMs?: number
  maxAttempts?: number
  retryBaseMs?: number
  maxRetryDelayMs?: number
  sleep?: (milliseconds: number) => Promise<void>
  now?: () => Date | number
}

export class BachsCheckoutError extends Error {
  readonly status: number | null
  readonly retryable: boolean
  readonly retryAfterMs: number | null

  constructor(message: string, status: number | null, retryable: boolean, retryAfterMs: number | null = null) {
    super(message)
    this.name = 'BachsCheckoutError'
    this.status = status
    this.retryable = retryable
    this.retryAfterMs = retryAfterMs
  }
}

/**
 * True only when Bachs explicitly rejected the request before a checkout
 * session could have been created.  Transport failures, malformed success
 * payloads, 408 timeouts, and 409 idempotency conflicts are all uncertain:
 * the provider may already own a session for the same idempotency key.
 */
export function isDefinitiveNoSessionError(error: unknown): error is BachsCheckoutError {
  if (!(error instanceof BachsCheckoutError) || error.retryable || error.status === null) return false
  return error.status >= 400 && error.status < 500 && ![408, 409, 429].includes(error.status)
}

// Keep the failure-oriented name available to callers that classify provider
// errors at the payment boundary.
export const isDefinitiveNoSessionFailure = isDefinitiveNoSessionError

function asNonEmptyString(value: unknown, label: string, maxLength = 1_000): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > maxLength) {
    throw new Error(`${label} must be a non-empty string.`)
  }
  return value.trim()
}

function trustedSiteUrl(input: CreateCheckoutInput): string {
  const configured = input.config ?? bachsConfig()
  const configuredOrigin = configured.siteUrl
  if (input.siteUrl) {
    let suppliedOrigin: string
    try {
      const parsed = new URL(input.siteUrl)
      if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
        throw new Error('invalid origin')
      }
      suppliedOrigin = parsed.origin
    } catch {
      throw new Error('Bachs checkout site URL is not trusted.')
    }
    if (suppliedOrigin !== configuredOrigin) throw new Error('Bachs checkout site URL does not match configuration.')
  }
  return configuredOrigin
}

function callbackUrl(siteUrl: string, path: string): string {
  return new URL(path, `${siteUrl.replace(/\/$/, '')}/`).toString()
}

/** Build the exact server-owned body for a hosted Bachs award checkout. */
export function buildCheckoutRequest(input: CreateCheckoutInput): BachsCheckoutRequest {
  const orderId = asNonEmptyString(input.orderId, 'orderId')
  const attemptId = asNonEmptyString(input.attemptId, 'attemptId')
  const reference = asNonEmptyString(input.reference, 'reference', 128)
  const idempotencyKey = asNonEmptyString(input.idempotencyKey, 'idempotencyKey', 255)
  void idempotencyKey
  const email = asNonEmptyString(input.customer.email, 'customer email', 320)
  if (!email.includes('@')) throw new Error('customer email must be valid.')
  const siteUrl = trustedSiteUrl(input)
  const fee = awardFee(input.currency)

  const customer: BachsCheckoutRequest['customer'] = { email }
  if (input.customer.name?.trim()) customer.name = input.customer.name.trim()
  if (input.customer.phoneNumber?.trim()) customer.phone_number = input.customer.phoneNumber.trim()

  return {
    pricing: {
      currency: 'USD',
      amount: awardFee('USD').bachsAmount,
      currency_options: { NGN: awardFee('NGN').bachsAmount },
    },
    billing_currency: fee.currency,
    customer,
    reference,
    metadata: { order_id: orderId, payment_attempt_id: attemptId, purpose: 'afl_award_fee_v1' },
    success_url: callbackUrl(siteUrl, BACHS_AWARD_SUCCESS_PATH),
    cancel_url: callbackUrl(siteUrl, BACHS_AWARD_CANCEL_PATH),
    expires_in_minutes: 60,
  }
}

function parseRetryAfter(value: string | null, now: () => number): number | null {
  if (!value) return null
  const seconds = Number(value.trim())
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000)
  const date = Date.parse(value)
  if (!Number.isFinite(date)) return null
  return Math.max(0, date - now())
}

function safeProviderResponse(value: BachsCheckoutResponse): Record<string, unknown> {
  const allowed = new Set(['checkout_id', 'checkout_url', 'status', 'created_at', 'expires_at', 'reference'])
  const output: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!allowed.has(key)) continue
    output[key] = entry
  }
  return output
}

function responseObject(value: unknown): BachsCheckoutResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BachsCheckoutError('Bachs returned an invalid checkout response.', null, false)
  }
  return value as BachsCheckoutResponse
}

function parseSession(response: unknown, config: BachsConfig, now: Date): BachsCheckoutSession {
  const payload = responseObject(response)
  const checkoutId = asNonEmptyString(payload.checkout_id, 'Bachs checkout_id', 255)
  const checkoutUrl = asNonEmptyString(payload.checkout_url, 'Bachs checkout_url', 2_048)
  const status = typeof payload.status === 'string' ? payload.status.trim().toLowerCase() : ''
  if (status !== 'open') throw new BachsCheckoutError('Bachs checkout session is not open.', null, false)

  const createdAt = asNonEmptyString(payload.created_at, 'Bachs created_at', 100)
  const expiresAt = asNonEmptyString(payload.expires_at, 'Bachs expires_at', 100)
  const createdMs = Date.parse(createdAt)
  const expiresMs = Date.parse(expiresAt)
  if (!Number.isFinite(createdMs) || !Number.isFinite(expiresMs) || expiresMs <= createdMs || expiresMs <= now.getTime()) {
    throw new BachsCheckoutError('Bachs checkout session has invalid or expired timestamps.', null, false)
  }

  let url: URL
  try {
    url = new URL(checkoutUrl)
  } catch {
    throw new BachsCheckoutError('Bachs checkout URL is invalid.', null, false)
  }
  const checkoutHosts = config.checkoutHosts
  if (url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash || !checkoutHosts.has(url.hostname.toLowerCase())) {
    throw new BachsCheckoutError('Bachs checkout URL is outside the configured allowlist.', null, false)
  }

  return {
    checkoutId,
    checkoutUrl: url.toString(),
    status: 'open',
    createdAt,
    expiresAt,
    safeProviderResponse: safeProviderResponse(payload),
  }
}

function sleepDefault(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function isRetryableError(error: unknown): boolean {
  return error instanceof BachsCheckoutError ? error.retryable : true
}

/** Create a Bachs hosted checkout with bounded, idempotent retries. */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
  options: CreateCheckoutOptions = {},
): Promise<BachsCheckoutSession> {
  const config = options.config ?? input.config ?? bachsConfig()
  const body = JSON.stringify(buildCheckoutRequest({ ...input, config }))
  const timeoutMs = options.timeoutMs ?? 12_000
  const maxAttempts = Math.min(3, Math.max(1, options.maxAttempts ?? 3))
  const retryBaseMs = Math.max(0, options.retryBaseMs ?? 250)
  const maxRetryDelayMs = Math.max(0, options.maxRetryDelayMs ?? 10_000)
  const sleep = options.sleep ?? sleepDefault
  const nowDate = () => {
    const raw = options.now?.() ?? new Date()
    return raw instanceof Date ? raw : new Date(raw)
  }
  const nowMs = () => nowDate().getTime()
  const fetcher = options.fetcher ?? options.fetch ?? fetch
  let lastError: unknown = new BachsCheckoutError('Bachs checkout request failed.', null, true)

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      const prior = lastError instanceof BachsCheckoutError ? lastError : null
      const retryAfter = prior?.retryAfterMs ?? null
      const delay = Math.min(maxRetryDelayMs, retryAfter ?? retryBaseMs * 2 ** (attempt - 1))
      await sleep(delay)
    }

    const controller = new AbortController()
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const request = Promise.resolve().then(() => fetcher(`${config.apiBaseUrl}/v1/checkout-sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Idempotency-Key': input.idempotencyKey,
        },
        body,
        signal: controller.signal,
      }))
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort()
          reject(new BachsCheckoutError('Bachs checkout request timed out.', null, true))
        }, timeoutMs)
      })
      const response = await Promise.race([request, timeoutPromise])
      const text = await Promise.race([response.text().catch(() => ''), timeoutPromise])
      let payload: unknown = null
      if (text.trim()) {
        try {
          payload = JSON.parse(text)
        } catch {
          payload = null
        }
      }
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500
        const retryAfter = response.status === 429 ? parseRetryAfter(response.headers.get('Retry-After'), nowMs) : null
        throw new BachsCheckoutError(`Bachs checkout request failed with HTTP ${response.status}.`, response.status, retryable, retryAfter)
      }
      try {
        return parseSession(payload, config, nowDate())
      } catch (error) {
        if (error instanceof BachsCheckoutError) throw error
        throw new BachsCheckoutError('Bachs returned an invalid checkout response.', null, false)
      }
    } catch (error) {
      lastError = error
      if (!isRetryableError(error) || attempt === maxAttempts - 1) throw error
      continue
    } finally {
      if (timeout !== undefined) clearTimeout(timeout)
    }
  }

  throw lastError
}
