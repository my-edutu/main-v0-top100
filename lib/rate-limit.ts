import { createAdminClient } from '@/lib/supabase/server'

export interface RateLimitConfig {
  maxRequests: number
  windowSeconds: number
  identifier?: string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
  unavailable?: boolean
}

type RateLimitRpcRow = {
  allowed: boolean
  request_count: number
  remaining: number
  reset_at: string
}

export class RateLimitUnavailableError extends Error {
  constructor(message = 'Rate-limit service is unavailable') {
    super(message)
    this.name = 'RateLimitUnavailableError'
  }
}

const hashIdentifier = async (identifier: string): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(identifier),
  )

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const isRateLimitRpcRow = (value: unknown): value is RateLimitRpcRow => {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>

  return (
    typeof row.allowed === 'boolean' &&
    typeof row.request_count === 'number' &&
    typeof row.remaining === 'number' &&
    typeof row.reset_at === 'string' &&
    Number.isFinite(Date.parse(row.reset_at))
  )
}

/**
 * Atomically consumes one request from a shared Supabase/Postgres rate limit.
 *
 * The identifier is SHA-256 hashed before it is sent to the database so raw IP
 * addresses or other client identifiers are never persisted in rate-limit state.
 * Requests fail closed when the shared limiter cannot be reached. Returning a
 * marked result lets every route emit a retryable 503 instead of an unhandled
 * server error or a misleading client-quota 429.
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds, identifier = 'default' } = config

  if (!Number.isInteger(maxRequests) || maxRequests <= 0 || maxRequests > 100000) {
    throw new RangeError('maxRequests must be an integer between 1 and 100000')
  }

  if (!Number.isInteger(windowSeconds) || windowSeconds <= 0 || windowSeconds > 86400) {
    throw new RangeError('windowSeconds must be an integer between 1 and 86400')
  }

  const keyHash = await hashIdentifier(identifier)

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.rpc('consume_api_rate_limit', {
      p_key_hash: keyHash,
      p_limit: maxRequests,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('[rate-limit] shared limiter RPC failed:', error.message)
      throw new RateLimitUnavailableError()
    }

    const row = Array.isArray(data) ? data[0] : data
    if (!isRateLimitRpcRow(row)) {
      console.error('[rate-limit] shared limiter returned an invalid payload')
      throw new RateLimitUnavailableError()
    }

    return {
      success: row.allowed,
      limit: maxRequests,
      remaining: Math.max(0, row.remaining),
      reset: new Date(row.reset_at).getTime(),
    }
  } catch (error) {
    if (error instanceof RangeError) throw error
    console.error('[rate-limit] shared limiter unavailable:', error)
    return { success: false, limit: maxRequests, remaining: 0, reset: Date.now() + 10_000, unavailable: true }
  }
}

/**
 * Route-boundary helper that keeps limiter outages distinct from an actual
 * client quota hit. Routes should return the resulting 503 so clients can retry
 * instead of turning a dependency outage into an opaque 500.
 */
export async function rateLimitResponse(
  configs: RateLimitConfig[],
  message: string,
): Promise<Response | null> {
  try {
    for (const config of configs) {
      const result = await checkRateLimit(config)
      if (!result.success) return createRateLimitResponse(result, message)
    }
    return null
  } catch (error) {
    console.error('[rate-limit] request denied because shared limiter is unavailable:', error)
    return Response.json(
      { error: 'Signup is temporarily unavailable. Please try again shortly.' },
      { status: 503, headers: { 'Retry-After': '10' } },
    )
  }
}

export const RATE_LIMITS = {
  AUTH: {
    maxRequests: 5,
    windowSeconds: 60,
  },
  ADMIN: {
    maxRequests: 30,
    windowSeconds: 60,
  },
  PUBLIC: {
    maxRequests: 100,
    windowSeconds: 60,
  },
  UPLOAD: {
    maxRequests: 10,
    windowSeconds: 300,
  },
  QUERY: {
    maxRequests: 50,
    windowSeconds: 60,
  },
  NEWSLETTER: {
    maxRequests: 3,
    windowSeconds: 60,
  },
  CONTACT: {
    maxRequests: 5,
    windowSeconds: 300,
  },
} as const

/**
 * Resolve the best server-provided client IP available from common reverse proxies.
 * The returned identifier is hashed before persistence by checkRateLimit().
 */
export function getClientIdentifier(headers: Headers): string {
  const cfConnectingIp = headers.get('cf-connecting-ip')?.trim()
  if (cfConnectingIp) return cfConnectingIp

  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  return 'unknown'
}

export function createRateLimitResponse(result: RateLimitResult, message?: string) {
  if (result.unavailable) {
    return Response.json(
      { error: 'This service is temporarily unavailable. Please try again shortly.', retryAfter: 10 },
      { status: 503, headers: { 'Retry-After': '10' } },
    )
  }
  const resetDate = new Date(result.reset)
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))

  return Response.json(
    {
      error: message || 'Too many requests. Please try again later.',
      retryAfter,
      resetAt: resetDate.toISOString(),
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': retryAfter.toString(),
      },
    },
  )
}
