import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), createAdminClient: vi.fn(), provision: vi.fn(), loadAudience: vi.fn(), send: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/awards/outreach-server', async original => ({ ...await original<typeof import('@/lib/awards/outreach-server')>(), loadOutreachAudience: mocks.loadAudience }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: mocks.send }))
vi.mock('@/lib/admin-email/provision', () => ({ provisionCampaign: mocks.provision }))
import { GET, POST } from '@/app/api/admin/email/route'
const request = (method: string, body?: unknown, origin = 'https://top100afl.com') => new NextRequest('https://top100afl.com/api/admin/email', { method, headers: { origin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs() })
it('denies non-admins before reading campaign records', async () => {
  mocks.requireAdmin.mockResolvedValue({ error: Response.json({ message: 'Forbidden' }, { status: 403 }) })
  expect((await GET(request('GET'))).status).toBe(403); expect(mocks.createAdminClient).not.toHaveBeenCalled()
})
it('rejects cross-origin scheduling', async () => {
  expect((await POST(request('POST', {}, 'https://other.example'))).status).toBe(403); expect(mocks.provision).not.toHaveBeenCalled()
})
it('rejects invalid campaign input', async () => {
  mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin' } })
  expect((await POST(request('POST', { action: 'schedule', recipients: ['other@example.com'] }))).status).toBe(400)
  expect(mocks.provision).not.toHaveBeenCalled()
})
it('marks a campaign cancelled before asking Listmonk to stop', async () => {
  mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin' } })
  const values: unknown[] = []
  mocks.createAdminClient.mockReturnValue({ from: () => {
    const query = { update: (value: unknown) => { values.push(value); return query }, eq: () => query, in: () => query, select: () => query, maybeSingle: async () => ({ data: { listmonk_id: null }, error: null }) }; return query
  } })
  const response = await POST(request('POST', { action: 'cancel', campaignId: '00000000-0000-4000-8000-000000000001' }))
  expect(response.status).toBe(200); expect(values).toContainEqual(expect.objectContaining({ status: 'cancelled' }))
})

it('never sends a test to a suppressed awardee', async () => {
  mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin' } })
  mocks.createAdminClient.mockReturnValue({})
  mocks.loadAudience.mockResolvedValue({ setup: true, members: [{ id: '00000000-0000-4000-8000-000000000001', suppressed: true }], contacts: [] })
  const response = await POST(request('POST', { action: 'test', awardeeId: '00000000-0000-4000-8000-000000000001', template: 'general', draft: { subject: 'Hello', body: 'Hello {{first_name}}' } }))
  expect(response.status).toBe(409); expect(mocks.send).not.toHaveBeenCalled()
})
