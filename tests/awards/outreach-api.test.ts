import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), createAdminClient: vi.fn(), loadAudience: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/awards/outreach-server', async original => ({ ...await original<typeof import('@/lib/awards/outreach-server')>(), loadOutreachAudience: mocks.loadAudience }))
import { GET, POST, PATCH } from '@/app/api/admin/awards/outreach/route'
beforeEach(() => { vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin' } }) })
const request = (method: string, body?: unknown, origin = 'https://www.top100afl.com') => new NextRequest('https://www.top100afl.com/api/admin/awards/outreach', { method, headers: { origin, cookie: 'session=test', 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
it('denies non-admin contact directory reads', async () => {
  mocks.requireAdmin.mockResolvedValue({ error: Response.json({ message: 'Forbidden' }, { status: 403 }) })
  expect((await GET(request('GET'))).status).toBe(403)
  expect(mocks.createAdminClient).not.toHaveBeenCalled()
})
it('rejects cross-origin export and contact mutations', async () => {
  expect((await POST(request('POST', { action: 'export' }, 'https://attacker.test'))).status).toBe(403)
  expect((await PATCH(request('PATCH', {}, 'https://attacker.test'))).status).toBe(403)
  expect(mocks.createAdminClient).not.toHaveBeenCalled()
})
it('rejects arbitrary recipient lists and invalid campaign filters', async () => {
  const res = await POST(request('POST', { action: 'campaign', recipients: ['other@example.com'], year: '2026', segment: 'recovery' }))
  expect(res.status).toBe(400)
  expect(mocks.createAdminClient).not.toHaveBeenCalled()
})
it('rejects invalid notes rather than accepting arbitrary stored fields', async () => {
  expect((await PATCH(request('PATCH', { awardeeId: 'invalid', notes: 'x', token: 'replacement' }))).status).toBe(400)
  expect(mocks.createAdminClient).not.toHaveBeenCalled()
})
it('copies email addresses without falsely issuing a tracked link', async () => {
  mocks.createAdminClient.mockReturnValue({ from: () => { throw new Error('Email-only export must not touch tracking records') } })
  mocks.loadAudience.mockResolvedValue({ setup: true, contacts: [], members: [{ id: 'a', awardeeIds: ['a'], name: 'Member', email: 'member@example.com', years: [2026], profileId: 'p', state: 'recovery', suppressed: false, emailable: true, lastContactedAt: null }] })
  const response = await POST(request('POST', { action: 'export', format: 'emails', filter: { year: '2026', segment: 'recovery' }, template: 'recovery', limit: 50, draft: { subject: 'Help with your award', body: 'Hi {{name}}' } }))
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('member@example.com')
})
it('requires provider-review evidence before resolving an uncertain email outcome', async () => {
  const input = { action: 'resolve_delivery', recipientId: '00000000-0000-4000-8000-000000000001', outcome: 'not_sent', reviewNote: 'Provider logs show a rejected envelope.', confirmed: true }
  const values: unknown[] = []
  mocks.createAdminClient.mockReturnValue({ from: () => {
    const query = { update: (value: unknown) => { values.push(value); return query }, eq: () => query, select: () => query, maybeSingle: async () => ({ data: { id: input.recipientId }, error: null }) }; return query
  } })
  const response = await POST(request('POST', input))
  expect(response.status).toBe(200)
  expect(values).toContainEqual(expect.objectContaining({ status: 'failed', outcome: expect.stringContaining('Provider logs show a rejected envelope.') }))
})
