import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const mocks = vi.hoisted(() => ({ admin: vi.fn(), origin: vi.fn(), db: vi.fn(), send: vi.fn(), code: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.admin }))
vi.mock('@/lib/security/same-origin', () => ({ rejectCrossOriginMutation: mocks.origin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.db }))
vi.mock('@/lib/access-codes', () => ({ generateCode: mocks.code }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: mocks.send }))
import { POST } from '@/app/api/admin/awardees/contact/route'
const request = (body: unknown) => new NextRequest('https://top100afl.com/api/admin/awardees/contact', { method: 'POST', body: JSON.stringify(body) })
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs() })
describe('admin member contact boundary', () => {
  it('denies unauthorized sending before any database or SMTP access', async () => {
    mocks.admin.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) })
    expect((await POST(request({}))).status).toBe(403)
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('rejects caller-supplied recipient addresses', async () => {
    mocks.admin.mockResolvedValue({ user: { id: 'admin' } })
    expect((await POST(request({ awardeeId: '00000000-0000-4000-8000-000000000000', template: 'welcome', expectedEmail: 'ada@example.com', expectedActivated: false, email: 'other@example.com' }))).status).toBe(400)
    expect(mocks.db).not.toHaveBeenCalled()
  })
  it('reports missing SMTP before reserving a send or creating a code', async () => {
    mocks.admin.mockResolvedValue({ user: { id: 'admin' } })
    vi.stubEnv('BREVO_SMTP_LOGIN', '')
    vi.stubEnv('BREVO_SMTP_KEY', '')
    expect((await POST(request({ awardeeId: '00000000-0000-4000-8000-000000000000', template: 'welcome', expectedEmail: 'ada@example.com', expectedActivated: false }))).status).toBe(503)
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
})

function query(result: unknown) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'in', 'limit', 'insert', 'update', 'maybeSingle', 'single']) builder[method] = () => builder
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return builder
}
const valid = { awardeeId: '00000000-0000-4000-8000-000000000000', template: 'reminder', expectedEmail: 'ada@example.com', expectedActivated: true }
const awardee = { id: valid.awardeeId, name: 'Ada', email: 'old@example.com', profile_id: 'profile' }
function setup(results: unknown[]) {
  mocks.admin.mockResolvedValue({ user: { id: 'admin' } })
  vi.stubEnv('BREVO_SMTP_LOGIN', 'smtp-user')
  vi.stubEnv('BREVO_SMTP_KEY', 'smtp-key')
  const from = vi.fn(() => {
    if (!results.length) throw new Error('Unexpected database operation')
    return query(results.shift())
  })
  mocks.db.mockReturnValue({ from })
  return from
}
describe('reviewed SMTP delivery', () => {
  it('stops before reservation if the recipient email changed after preview', async () => {
    setup([{ data: awardee }, { data: { id: 'profile', user_id: 'user', email: 'new@example.com' } }])
    expect((await POST(request(valid))).status).toBe(409)
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.code).not.toHaveBeenCalled()
  })
  it('does not send or create a code if the daily reservation already exists', async () => {
    setup([{ data: awardee }, { data: { id: 'profile', user_id: 'user', email: valid.expectedEmail } }, { data: [] }, { error: { code: '23505' } }])
    expect((await POST(request(valid))).status).toBe(409)
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.code).not.toHaveBeenCalled()
  })
  it('sends activated members a dashboard reminder and records acceptance', async () => {
    const from = setup([{ data: awardee }, { data: { id: 'profile', user_id: 'user', email: valid.expectedEmail } }, { data: [] }, { data: { id: 'attempt' } }, {}, {}])
    mocks.send.mockResolvedValue({ ok: true })
    const response = await POST(request(valid))
    expect((await response.json()).outcome).toBe('accepted')
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: valid.expectedEmail, text: expect.stringContaining('/dashboard'), requireBrevoSmtp: true }))
    expect(mocks.code).not.toHaveBeenCalled()
    expect(from).toHaveBeenCalledTimes(6)
  })
  it('records SMTP ambiguity as unknown without retrying', async () => {
    setup([{ data: awardee }, { data: { id: 'profile', user_id: 'user', email: valid.expectedEmail } }, { data: [] }, { data: { id: 'attempt' } }, {}, {}])
    mocks.send.mockResolvedValue({ ok: false, delivery: 'unknown' })
    const response = await POST(request(valid))
    expect(response.status).toBe(502)
    expect((await response.json()).outcome).toBe('unknown')
    expect(mocks.send).toHaveBeenCalledTimes(1)
  })
})
