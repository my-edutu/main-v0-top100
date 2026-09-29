import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: { id: 'member-1' } as { id: string } | null,
  downloaded: vi.fn(),
  coverUrl: 'https://media.example/member-1/afl-2026-cover.png?v=1' as string | null,
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: vi.fn(async () => mocks.user) }))
vi.mock('@/lib/awards/access-server', () => ({ hasConfirmedAwardPayment: vi.fn(async () => true) }))
vi.mock('@/lib/media/storage', () => ({ downloadMedia: mocks.downloaded }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { portfolio_cover_url: mocks.coverUrl }, error: null }) }) }),
    }),
  })),
}))

import { GET } from '@/app/api/member/portfolio-cover/download/route'

describe('GET /api/member/portfolio-cover/download', () => {
  beforeEach(() => {
    mocks.user = { id: 'member-1' }
    mocks.coverUrl = 'https://media.example/member-1/afl-2026-cover.png?v=1'
    mocks.downloaded.mockReset().mockResolvedValue(Buffer.from('cover-image'))
  })

  it('streams the authenticated member’s saved cover as a same-origin attachment', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(Buffer.from(await response.arrayBuffer())).toEqual(Buffer.from('cover-image'))
    expect(mocks.downloaded).toHaveBeenCalledWith('portfolio-covers', 'member-1/afl-2026-cover.png')
  })

  it('does not expose a cover to an unauthenticated visitor', async () => {
    mocks.user = null

    const response = await GET()

    expect(response.status).toBe(401)
    expect(mocks.downloaded).not.toHaveBeenCalled()
  })

  it('does not try to download when the member has no saved cover', async () => {
    mocks.coverUrl = null

    const response = await GET()

    expect(response.status).toBe(404)
    expect(mocks.downloaded).not.toHaveBeenCalled()
  })
})
