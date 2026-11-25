import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.createAdminClient,
}))

import { GET, POST } from '@/app/api/admin/social/drafts/route'

function request(method: string, body?: unknown) {
  return new Request('https://www.top100afl.com/api/admin/social/drafts', {
    method,
    headers:
      body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as never
}

describe('/api/admin/social/drafts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({
      user: { id: '24c4f56b-f3d8-4f8a-81d8-a09509e04511' },
    })
  })

  it('blocks draft reads before creating a privileged database client', async () => {
    mocks.requireAdmin.mockResolvedValue({
      error: Response.json(
        { message: 'Admin access required.' },
        { status: 403 },
      ),
    })
    const response = await GET(request('GET'))
    expect(response.status).toBe(403)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects malformed and out-of-contract draft inputs before database access', async () => {
    const malformed = await POST(
      new Request('https://www.top100afl.com/api/admin/social/drafts', {
        method: 'POST',
        body: '{',
        headers: { 'content-type': 'application/json' },
      }) as never,
    )
    const invalid = await POST(
      request('POST', {
        awardeeId: 'not-an-id',
        platform: 'threads',
        caption: 'caption',
      }),
    )
    expect(malformed.status).toBe(400)
    expect(invalid.status).toBe(400)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('keeps another admin’s newer draft when saving from an older editor', async () => {
    const profile = {
      awardee_id: '24c4f56b-f3d8-4f8a-81d8-a09509e04511',
      name: 'Amara',
      slug: 'amara',
      is_public: true,
    }
    const makeQuery = (data: unknown) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    })
    mocks.createAdminClient.mockReturnValue({
      from: (table: string) =>
        makeQuery(
          table === 'awardee_directory'
            ? profile
            : {
                id: 'draft',
                publish_state: 'ready',
                updated_at: '2026-11-16T11:00:00.000Z',
              },
        ),
    })
    const response = await POST(
      request('POST', {
        awardeeId: profile.awardee_id,
        platform: 'x',
        caption: 'My earlier edit',
        expectedUpdatedAt: '2026-11-16T10:00:00.000Z',
      }),
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining('another admin'),
    })
  })

  it('rejects saving a generated feature after its public profile has changed', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({
          data: {
            awardee_id: '24c4f56b-f3d8-4f8a-81d8-a09509e04511',
            name: 'Amara',
            slug: 'amara',
            is_public: true,
            updated_at: '2026-11-16T11:00:00Z',
          },
          error: null,
        }),
    }
    mocks.createAdminClient.mockReturnValue({ from: () => query })
    const response = await POST(
      request('POST', {
        awardeeId: '24c4f56b-f3d8-4f8a-81d8-a09509e04511',
        platform: 'linkedin',
        caption: 'Old facts',
        signature: 'a'.repeat(64),
      }),
    )
    expect(response.status).toBe(409)
  })
})
