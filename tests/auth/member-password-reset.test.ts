import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ user: vi.fn(), rate: vi.fn(), reset: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, createRateLimitResponse: vi.fn(() => new Response(null, { status: 429 })) }))
vi.mock('@/lib/supabase/password-recovery-client', () => ({ createPasswordRecoveryClient: () => ({ auth: { resetPasswordForEmail: mocks.reset } }) }))
import { POST } from '@/app/api/member/password-reset/route'
const request = (origin = 'http://localhost:3100') => new NextRequest('http://localhost:3100/api/member/password-reset', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ email: 'other@example.com' }) })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.user.mockResolvedValue({ id: 'member', email: 'owner@example.com' })
  mocks.rate.mockResolvedValue({ success: true })
  mocks.reset.mockResolvedValue({ error: null })
})
it('uses only the verified account email even with a different email in the body', async () => {
  expect((await POST(request())).status).toBe(200)
  expect(mocks.reset).toHaveBeenCalledWith('owner@example.com', expect.any(Object))
})
it('rejects unauthenticated requests without sending an email', async () => {
  mocks.user.mockResolvedValue(null)
  expect((await POST(request())).status).toBe(401)
  expect(mocks.reset).not.toHaveBeenCalled()
})
it('rejects requests from another origin', async () => {
  expect((await POST(request('https://other.example'))).status).toBe(403)
  expect(mocks.reset).not.toHaveBeenCalled()
})
it('does not send when rate limited', async () => {
  mocks.rate.mockResolvedValue({ success: false })
  expect((await POST(request())).status).toBe(429)
  expect(mocks.reset).not.toHaveBeenCalled()
})
