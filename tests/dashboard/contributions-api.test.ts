import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ user: vi.fn(), insert: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: () => ({ insert: mocks.insert }) }) }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, RATE_LIMITS: { CONTACT: {} }, createRateLimitResponse: () => new Response('', { status: 429 }) }))
import { POST } from '@/app/api/member/contributions/route'
const payload = { campaign: 'give-back', kind: 'cash', amount: '25', currency: 'USD', name: 'Test Person', details: 'Support school materials for a local community.', consent: true }
const request = (body: unknown) => new NextRequest('http://localhost/api/member/contributions', { method: 'POST', body: JSON.stringify(body) })
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: 'member-id', email: 'member@example.test' }); mocks.rate.mockResolvedValue({ success: true }); mocks.insert.mockResolvedValue({ error: null }) })
describe('contribution inbox API', () => {
  it('requires authentication', async () => { mocks.user.mockResolvedValue(null); expect((await POST(request(payload))).status).toBe(401); expect(mocks.insert).not.toHaveBeenCalled() })
  it('rejects invalid requests before storage', async () => { expect((await POST(request({ ...payload, amount: '-1' }))).status).toBe(400); expect(mocks.insert).not.toHaveBeenCalled() })
  it('uses authenticated email and saves a reviewable pledge', async () => { expect((await POST(request({ ...payload, email: 'spoof@example.test' }))).status).toBe(201); expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ email: 'member@example.test', status: 'unread', type: 'partnership', message: expect.stringContaining('Pledge only. No payment collected.') })) })
  it('does not report success if storage fails', async () => { mocks.insert.mockResolvedValue({ error: { message: 'offline' } }); expect((await POST(request(payload))).status).toBe(500) })
})
