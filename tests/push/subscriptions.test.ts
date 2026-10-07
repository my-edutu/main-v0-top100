import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ user: vi.fn(), owner: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: m.user }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: true }), getClientIdentifier: () => 'test', createRateLimitResponse: vi.fn(), RateLimitUnavailableError: class extends Error {} }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: m.from }) }))
import { POST, DELETE, GET } from '@/app/api/notifications/subscribe/route'
afterEach(() => vi.clearAllMocks())
it('requires sign-in for subscription creation, deletion, and status', async () => {
  m.user.mockResolvedValue(null)
  const request = new NextRequest('http://localhost/api/notifications/subscribe', { method: 'POST', body: '{}' })
  for (const handler of [POST, DELETE, GET]) expect((await handler(request)).status).toBe(401)
  expect(m.from).not.toHaveBeenCalled()
})
it('rejects a private-network endpoint without contacting it or writing the database', async () => {
  m.user.mockResolvedValue({ id: 'member' })
  const request = new NextRequest('http://localhost/api/notifications/subscribe', { method: 'POST', body: JSON.stringify({ subscription: { endpoint: 'https://127.0.0.1/secret', keys: {} } }) })
  expect((await POST(request)).status).toBe(400)
  expect(m.from).not.toHaveBeenCalled()
})
it('prevents taking over another account’s subscription', async () => {
  m.user.mockResolvedValue({ id: 'member' })
  m.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { user_id: 'other' } }) }) }) })
  const request = new NextRequest('http://localhost/api/notifications/subscribe', { method: 'POST', body: JSON.stringify({ subscription: { endpoint: 'https://fcm.googleapis.com/send/abc', keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } } }) })
  expect((await POST(request)).status).toBe(409)
})
