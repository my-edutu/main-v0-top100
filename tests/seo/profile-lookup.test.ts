import { beforeEach, expect, it, vi } from 'vitest'
const { fallback, lookup } = vi.hoisted(() => ({ fallback: vi.fn(), lookup: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }))
vi.mock('@/lib/awardees', () => ({ getAwardees: fallback }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: lookup }) }) }) }) }))
vi.mock('@/lib/dev-dashboard/store', () => ({}))
import { fetchAwardeeBySlug } from '@/lib/dashboard/profile-service'
beforeEach(() => vi.clearAllMocks())
it('does not resurrect an absent public record from the workbook', async () => {
  lookup.mockResolvedValue({ data: null, error: null })
  fallback.mockResolvedValue([{ slug: 'hidden-member', is_public: true }])
  expect(await fetchAwardeeBySlug('hidden-member')).toBeNull()
  expect(fallback).not.toHaveBeenCalled()
})

it('does not publish workbook data during a database failure', async () => {
  lookup.mockResolvedValue({ data: null, error: { message: 'database unavailable' } })
  await expect(fetchAwardeeBySlug('hidden-member')).rejects.toThrow('Public profile lookup failed')
  expect(fallback).not.toHaveBeenCalled()
})
it('propagates transport failures without a public fallback', async () => {
  lookup.mockRejectedValue(new Error('connection failed'))
  await expect(fetchAwardeeBySlug('hidden-member')).rejects.toThrow('connection failed')
  expect(fallback).not.toHaveBeenCalled()
})
