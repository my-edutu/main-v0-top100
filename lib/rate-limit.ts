// @lib/rate-limit.ts
/**
 * In-memory rate limiter for API routes
 *
 * SECURITY: Protects against brute force, DDoS, and API abuse
 *
 * For production with multiple servers, consider using:
 * - @upstash/ratelimit with Redis
 * - Vercel Edge Config
 * - External rate limiting service (Cloudflare, etc.)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (resets on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Optional: Custom identifier (defaults to IP address)
   */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if request is within rate limit
 *
 * @example
 * const result = checkRateLimit({
 *   maxRequests: 10,
 *   windowSeconds: 60,
 *   identifier: request.headers.get('x-forwarded-for') || 'unknown'
 * });
 *
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests. Please try again later.' },
 *     {
 *       status: 429,
 *       headers: {
 *         'X-RateLimit-Limit': result.limit.toString(),
 *         'X-RateLimit-Remaining': result.remaining.toString(),
 *         'X-RateLimit-Reset': result.reset.toString(),
 *       }
 *     }
 *   );
 * }
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { maxRequests, windowSeconds, identifier = 'default' } = config;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const entry = rateLimitStore.get(identifier);

  // If no entry or window expired, create new entry
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(identifier, newEntry);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: newEntry.resetAt,
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Preset rate limit configurations for different endpoint types
 */
export const RATE_LIMITS = {
  // Authentication endpoints - strict
  AUTH: {
    maxRequests: 5,
    windowSeconds: 60, // 5 requests per minute
  },

  // Admin API endpoints - moderate
  ADMIN: {
    maxRequests: 30,
    windowSeconds: 60, // 30 requests per minute
  },

  // Public API endpoints - lenient
  PUBLIC: {
    maxRequests: 100,
    windowSeconds: 60, // 100 requests per minute
  },

  // File upload endpoints - very strict
  UPLOAD: {
    maxRequests: 10,
    windowSeconds: 300, // 10 uploads per 5 minutes
  },

  // Search/query endpoints - moderate
  QUERY: {
    maxRequests: 50,
    windowSeconds: 60, // 50 requests per minute
  },
} as const;

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(headers: Headers): string {
  // Try to get real IP from common proxy headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to 'unknown' if no IP found (shouldn't happen in production)
  return 'unknown';
}

/**
 * Helper to create rate limit response with proper headers
 */
export function createRateLimitResponse(result: RateLimitResult, message?: string) {
  const resetDate = new Date(result.reset);
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

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
      }
    }
  );
}
