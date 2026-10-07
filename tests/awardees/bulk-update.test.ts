import { expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ batches: [] as string[][], updates: [] as string[][] }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: async () => ({ user: { id: 'admin' } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ in: async (_: string, ids: string[]) => {
        mocks.batches.push(ids)
        return { data: ids.map(id => ({ id })), error: null }
      } }),
      update: () => ({ in: (_: string, ids: string[]) => ({ select: async () => {
        mocks.updates.push(ids)
        return { data: ids.map(id => ({ id })), error: null }
      } }) }),
    }),
  }),
}))
it('updates a large selection without exceeding 100 IDs per gateway query', async () => {
  const { PUT } = await import('@/app/api/awardees/route')
  const ids = Array.from({ length: 1250 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
  const response = await PUT(new NextRequest('http://localhost/api/awardees', {
    method: 'PUT', body: JSON.stringify({ ids, featured: true }),
  }))
  expect(response.status).toBe(200)
  expect(mocks.batches).toHaveLength(13)
  expect(mocks.updates.flat()).toEqual(ids)
  expect(Math.max(...mocks.batches.map(batch => batch.length), ...mocks.updates.map(batch => batch.length))).toBe(100)
  expect((await response.json()).awardees).toHaveLength(1250)
})
