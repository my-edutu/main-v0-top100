import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const mocks = vi.hoisted(() => ({ admin: vi.fn(), origin: vi.fn(), db: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.admin }))
vi.mock('@/lib/security/same-origin', () => ({ rejectCrossOriginMutation: mocks.origin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.db }))
import { POST } from '@/app/api/admin/awardees/contact/preview/route'
const id = '00000000-0000-4000-8000-000000000001'
const request = (body: unknown) => new NextRequest('https://top100afl.com/api/admin/awardees/contact/preview', { method: 'POST', body: JSON.stringify(body) })
function setup(results: unknown[]) {
  mocks.admin.mockResolvedValue({ user: { id: 'admin' } })
  const from = vi.fn(() => {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'in', 'or', 'order', 'range']) builder[method] = () => builder
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(results.shift()).then(resolve)
    return builder
  })
  mocks.db.mockReturnValue({ from })
  return from
}
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs() })
describe('non-mutating recipient preview', () => {
  it('requires admin access before reading recipients', async () => {
    mocks.admin.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) })
    expect((await POST(request({ awardeeIds: [id] }))).status).toBe(403)
    expect(mocks.db).not.toHaveBeenCalled()
  })
  it('rejects oversized batches', async () => {
    mocks.admin.mockResolvedValue({ user: { id: 'admin' } })
    expect((await POST(request({ awardeeIds: Array(501).fill(id) }))).status).toBe(400)
    expect(mocks.db).not.toHaveBeenCalled()
  })
  it('resolves account email and reports missing SMTP without writing anything', async () => {
    const from = setup([{ data: [{ id, name: 'Ada', email: 'old@example.com', profile_id: 'profile' }] },
      { data: [{ id: 'profile', user_id: 'user', email: 'ada@example.com' }] }, { data: [] }])
    vi.stubEnv('BREVO_SMTP_LOGIN', '')
    vi.stubEnv('BREVO_SMTP_KEY', '')
    const response = await POST(request({ awardeeIds: [id] }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ smtpReady: false, recipients: [{ email: 'ada@example.com', activated: true, eligible: true }] })
    expect(from).toHaveBeenCalledTimes(3)
  })
  it('treats missing tracking as unavailable, not as no previous contact', async () => {
    setup([{ data: [{ id, name: 'Ada', email: 'ada@example.com', profile_id: null }] }, { error: { code: '42P01' } }])
    expect((await POST(request({ awardeeIds: [id] }))).status).toBe(503)
  })
})
