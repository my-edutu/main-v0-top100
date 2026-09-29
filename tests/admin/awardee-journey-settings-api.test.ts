import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))

import { GET, PATCH } from '@/app/api/admin/onboarding-journey/route'

function request(method: string, body?: unknown) {
  return new Request('https://www.top100afl.com/api/admin/onboarding-journey', {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }) as never
}

describe('/api/admin/onboarding-journey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
  })

  it('blocks non-admin reads before accessing settings', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: Response.json({ message: 'Admin access required.' }, { status: 403 }) })
    const response = await GET(request('GET'))

    expect(response.status).toBe(403)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects invalid settings before any database write', async () => {
    const response = await PATCH(request('PATCH', {
      founderLinkedinUrl: 'javascript:alert(1)',
    }))

    expect(response.status).toBe(400)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })
})
