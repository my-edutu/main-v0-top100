import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ access: vi.fn(), db: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.access }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.db }))
import { GET } from '@/app/api/admin/social/awardees/route'
beforeEach(() => {
  vi.clearAllMocks()
  mocks.access.mockResolvedValue({ user: { id: 'admin' } })
})
describe('awardee feature search', () => {
  it('searches the database before paging results, including names outside the initial directory page', async () => {
    const query: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const method of ['select', 'eq', 'neq', 'order', 'limit', 'ilike', 'range'])
      query[method] = vi.fn().mockReturnValue(query)
    query.range.mockResolvedValue({
      data: [{ awardee_id: 'id', name: 'Zola', slug: 'zola', is_public: true }],
      count: 45,
      error: null,
    })
    mocks.db.mockReturnValue({ from: () => query })
    const response = await GET(
      new NextRequest(
        'https://top100afl.com/api/admin/social/awardees?q=Zola&page=2',
      ),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      awardees: [{ name: 'Zola' }],
      page: 2,
      total: 45,
      hasMore: true,
    })
    expect(query.ilike).toHaveBeenCalledWith('name', '%Zola%')
    expect(query.range).toHaveBeenCalledWith(20, 39)
  })
  it('rejects invalid pages without accessing the database', async () => {
    expect(
      (
        await GET(
          new NextRequest(
            'https://top100afl.com/api/admin/social/awardees?page=-2',
          ),
        )
      ).status,
    ).toBe(400)
    expect(mocks.db).not.toHaveBeenCalled()
  })
})
