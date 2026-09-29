import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))

import { GET, POST } from '@/app/api/admin/social/drafts/route'

function request(method: string, body?: unknown) {
  return new Request('https://www.top100afl.com/api/admin/social/drafts', {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never
}

describe('/api/admin/social/drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: '24c4f56b-f3d8-4f8a-81d8-a09509e04511' } })
  })

  it('blocks draft reads before creating a privileged database client', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: Response.json({ message: 'Admin access required.' }, { status: 403 }) })
    const response = await GET(request('GET'))
    expect(response.status).toBe(403)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects malformed and out-of-contract draft inputs before database access', async () => {
    const malformed = await POST(new Request('https://www.top100afl.com/api/admin/social/drafts', {
      method: 'POST', body: '{', headers: { 'content-type': 'application/json' },
    }) as never)
    const invalid = await POST(request('POST', {
      awardeeId: 'not-an-id', platform: 'threads', caption: 'caption',
    }))
    expect(malformed.status).toBe(400)
    expect(invalid.status).toBe(400)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })
})
