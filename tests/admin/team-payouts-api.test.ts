import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.auth }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }))
import { GET } from '@/app/api/admin/team-operations/payouts/route'
import { POST } from '@/app/api/admin/team-operations/payouts/[id]/route'
const teamId = '11111111-1111-4111-8111-111111111111'
const id = '22222222-2222-4222-8222-222222222222'
const actor = '33333333-3333-4333-8333-333333333333'
let rows: Record<string, Record<string, unknown>[]>
const row = () => rows.team_withdrawal_requests[0]
const request = (body?: unknown, origin = 'https://www.top100afl.com') => new NextRequest(`https://www.top100afl.com/api/admin/team-operations/payouts${body ? '/' + id : '?teamId=' + teamId}`, { method: body ? 'POST' : 'GET', headers: { origin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
const context = { params: Promise.resolve({ id }) }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ user: { id: actor } })
  rows = {
    team_teams: [{ id: teamId }],
    team_memberships: [{ id: 'admin-membership', team_id: teamId, user_id: actor, role: 'super_admin', status: 'active' }, { id: 'rep-membership', team_id: teamId, user_id: 'rep-user', role: 'agent', status: 'active', full_name: 'Test Rep' }],
    team_withdrawal_requests: [{ id, team_id: teamId, agent_id: 'rep-membership', amount_minor: 200000, currency: 'NGN', status: 'approved', payout_method: 'bank_transfer', payout_details: { bankName: 'Test Bank', accountName: 'Test Rep', accountNumber: '0123456789', secret: 'never expose' }, created_at: '2026-11-03T08:00:00Z', paid_at: null, team_memberships: { full_name: 'Test Rep', user_id: 'rep-user' }, team_withdrawal_payouts: [] }],
  }
  mocks.from.mockImplementation((table: string) => {
    let selected = [...(rows[table] ?? [])]
    const q = {
      select: () => q, eq: (key: string, value: unknown) => { selected = selected.filter(r => r[key] === value); return q },
      in: (key: string, values: unknown[]) => { selected = selected.filter(r => values.includes(r[key])); return q },
      order: () => q, range: (start: number, end: number) => Promise.resolve({ data: selected.slice(start, end + 1), count: selected.length, error: null }),
      maybeSingle: () => Promise.resolve({ data: selected[0] ?? null, error: null }),
    }; return q
  })
  mocks.rpc.mockImplementation(async (_name: string, args: Record<string, unknown>) => ({ data: { request_id: id, outcome: args.p_action === 'pay' ? 'paid' : args.p_action === 'approve' ? 'approved' : 'rejected' }, error: null }))
})
it('blocks non-admin reads and mutations before accessing payout data', async () => {
  mocks.auth.mockResolvedValue({ error: Response.json({}, { status: 403 }) })
  expect((await GET(request())).status).toBe(403)
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)).status).toBe(403)
  expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled()
})
it('returns team-scoped bank details with private caching and no arbitrary payout metadata', async () => {
  rows.team_withdrawal_requests.push({ ...row(), id: 'other', team_id: 'another-team' })
  const response = await GET(request()); const body = await response.json()
  expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store')
  expect(body.requests).toHaveLength(1)
  expect(body.requests[0]).toMatchObject({ amountMinor: 200000, bankName: 'Test Bank', accountName: 'Test Rep', accountNumber: '0123456789', canManage: true })
  expect(JSON.stringify(body)).not.toContain('never expose')
})
it('rejects cross-origin payment confirmation before authentication or mutation', async () => {
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }, 'https://evil.example'), context)).status).toBe(403)
  expect(mocks.auth).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled()
})
it('only allows an active super-admin membership for this request team to manage payouts', async () => {
  rows.team_memberships[0].team_id = 'other-team'
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)).status).toBe(403)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('prevents an administrator confirming their own withdrawal', async () => {
  row().agent_id = 'admin-membership'; row().team_memberships = { full_name: 'Admin', user_id: actor }
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)).status).toBe(403)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('requires a transfer reference and rejects client-controlled amount or account changes', async () => {
  for (const body of [{ action: 'pay', expectedStatus: 'approved' }, { action: 'pay', expectedStatus: 'approved', reference: 'bank-ref', paidAmountMinor: 1 }, { action: 'pay', expectedStatus: 'approved', reference: 'bank-ref', accountNumber: '9999999999' }]) {
    expect((await POST(request(body), context)).status).toBe(400)
  }
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('rejects stale status or a payment that has not been approved', async () => {
  row().status = 'requested'
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)).status).toBe(409)
  expect((await POST(request({ action: 'pay', expectedStatus: 'requested', reference: 'bank-ref' }), context)).status).toBe(409)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('records the full database-owned amount through the existing audited transition RPC', async () => {
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: ' bank-ref ' }), context)).status).toBe(200)
  expect(mocks.rpc).toHaveBeenCalledWith('team_transition_withdrawal', { p_request_id: id, p_actor: actor, p_action: 'pay', p_note: null, p_reference: 'bank-ref', p_paid_amount_minor: 200000 })
})
it('keeps insufficient-balance or concurrent state errors as failed confirmations', async () => {
  mocks.rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'agent ledger no longer covers this withdrawal' } })
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)).status).toBe(409)
})
it('does not confirm payments with missing bank details or unsafe money values', async () => {
  row().payout_details = { bankName: 'Test Bank' }
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)).status).toBe(409)
  row().amount_minor = '9007199254740993'
  expect((await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)).status).toBe(409)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('requires valid team/filter queries and paginates requests without truncating the queue', async () => {
  expect((await GET(new NextRequest('https://www.top100afl.com/api/admin/team-operations/payouts?teamId=bad'))).status).toBe(400)
  rows.team_withdrawal_requests = Array.from({ length: 25 }, (_, index) => ({ ...row(), id: String(index) }))
  const response = await GET(new NextRequest(`https://www.top100afl.com/api/admin/team-operations/payouts?teamId=${teamId}&page=2&status=all`))
  const body = await response.json()
  expect(body.requests).toHaveLength(5)
  expect(body).toMatchObject({ page: 2, pageSize: 20, total: 25 })
})
it('approves and rejects requests without creating a payout or accepting transfer amounts', async () => {
  row().status = 'requested'
  for (const action of ['approve', 'reject']) {
    expect((await POST(request({ action, expectedStatus: 'requested' }), context)).status).toBe(200)
    expect(mocks.rpc).toHaveBeenLastCalledWith('team_transition_withdrawal', {
      p_request_id: id, p_actor: actor, p_action: action,
      p_note: null, p_reference: null, p_paid_amount_minor: null,
    })
  }
})
it('never reports success when the database does not confirm the requested transition', async () => {
  mocks.rpc.mockResolvedValue({ data: { outcome: 'approved', request_id: id }, error: null })
  const response = await POST(request({ action: 'pay', expectedStatus: 'approved', reference: 'bank-ref' }), context)
  expect(response.status).toBe(503)
  expect(await response.json()).not.toHaveProperty('ok', true)
})
