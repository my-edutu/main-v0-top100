import { expect, it, vi } from 'vitest'
const row = { id: 'public', name: 'Leader', slug: 'leader' }
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => { throw new Error('Cookies unavailable in shared cache') },
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }) }),
}))
vi.mock('@/lib/awardees', () => ({ getAwardees: async () => [] }))
it('loads public profiles without reading request cookies in the shared cache', async () => {
  const { fetchAwardeeBySlug } = await import('@/lib/dashboard/profile-service')
  expect(await fetchAwardeeBySlug('leader')).toEqual(row)
})
