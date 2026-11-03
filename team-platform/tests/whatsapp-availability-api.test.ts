import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ member: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/api', () => {
  class ApiError extends Error { constructor(message: string, public status = 400) { super(message) } }
  return { ApiError, apiMember: mocks.member, jsonError: (e: unknown) => Response.json({ error: e instanceof Error ? e.message : 'error' }, { status: e instanceof ApiError ? e.status : 400 }) }
})
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
import { POST } from '@/app/api/whatsapp-availability/route'
const id = '11111111-1111-4111-8111-111111111111'
const body = { awardeeId: id, expectedPhone: '+2348031234567', unavailable: true }
const request = (value: unknown = body, origin = 'https://teams.top100afl.com') => new Request('https://teams.top100afl.com/api/whatsapp-availability', { method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
beforeEach(() => {
  vi.clearAllMocks()
  mocks.member.mockResolvedValue({ user: { id: 'actor' }, membership: { role: 'agent', team_id: 'team' } })
  mocks.rpc.mockResolvedValue({ data: { report: { source: 'rep_reported', phone: body.expectedPhone, reported_at: '2026-11-03T17:00:00Z' } }, error: null })
})
it('blocks cross-origin requests before authentication or writes', async () => {
  expect((await POST(request(body, 'https://evil.example'))).status).toBe(403)
  expect(mocks.member).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled()
})
it('requires an assigned rep role and refuses client proof or actor fields', async () => {
  mocks.member.mockResolvedValueOnce({ user: { id: 'admin' }, membership: { role: 'super_admin', team_id: 'team' } })
  expect((await POST(request())).status).toBe(403)
  expect((await POST(request({ ...body, source: 'verified', actor: 'someone-else' }))).status).toBe(400)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('sends identity from the authenticated member to the dedicated reporting RPC', async () => {
  const res = await POST(request())
  expect(res.status).toBe(200)
  expect(res.headers.get('Cache-Control')).toContain('no-store')
  expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('team_set_whatsapp_unavailable', { p_team_id: 'team', p_actor: 'actor', p_awardee_id: id, p_expected_phone: body.expectedPhone, p_unavailable: true })
})
it('keeps ownership and stale-phone failures as errors instead of claiming a saved report', async () => {
  for (const [code, status] of [['42501', 403], ['22023', 409]]) {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code } })
    expect((await POST(request())).status).toBe(status)
  }
})
it('allows undo only after the server confirms the report is cleared', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { report: null }, error: null })
  expect((await POST(request({ ...body, unavailable: false }))).status).toBe(200)
  mocks.rpc.mockResolvedValueOnce({ data: {}, error: null })
  expect((await POST(request({ ...body, unavailable: false }))).status).toBe(503)
})
it('does not report success for a malformed server report', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: { report: { source: 'rep_reported', phone: body.expectedPhone, reported_at: 'bad-date' } }, error: null })
  expect((await POST(request())).status).toBe(503)
})
