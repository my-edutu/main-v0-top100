import { expect, it, vi } from 'vitest'
import { rateLimitResponse } from '@/lib/rate-limit'

const state = vi.hoisted(() => ({ unavailable: false }))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    rpc: async () => state.unavailable
      ? { data: null, error: { message: 'RPC unavailable' } }
      : { data: { allowed: true, request_count: 1, remaining: 4, reset_at: new Date(Date.now() + 60_000).toISOString() }, error: null },
  }),
}))

it('returns a retryable service error when the shared limiter is unavailable', async () => {
  state.unavailable = true
  const response = await rateLimitResponse([
    { maxRequests: 5, windowSeconds: 60, identifier: 'signup-test' },
  ], 'Too many attempts.')
  expect(response?.status).toBe(503)
  expect(response?.headers.get('Retry-After')).toBe('10')
})

it('returns null when every configured rate limit allows the request', async () => {
  state.unavailable = false
  expect(await rateLimitResponse([
    { maxRequests: 5, windowSeconds: 60, identifier: 'signup-test' },
  ], 'Too many attempts.')).toBeNull()
})
