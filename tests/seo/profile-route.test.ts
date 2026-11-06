import { beforeEach, describe, expect, it, vi } from 'vitest'
const { fetchProfile, admin } = vi.hoisted(() => ({ fetchProfile: vi.fn(), admin: vi.fn() }))
vi.mock('@/lib/dashboard/profile-service', () => ({ fetchAwardeeBySlug: fetchProfile }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: admin }))
vi.mock('@/lib/awardees', () => ({ getAwardees: async () => [] }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') } }))
import Page, { generateMetadata } from '@/app/awardees/[slug]/page'
const params = Promise.resolve({ slug: 'amina-ali' })
describe('public profile route', () => {
  beforeEach(() => fetchProfile.mockReset())
  it.each([null, { is_public: false }])('excludes unavailable profiles (%j)', async (profile) => {
    fetchProfile.mockResolvedValue(profile)
    expect((await generateMetadata({ params })).robots).toEqual({ index: false, follow: false })
    await expect(Page({ params })).rejects.toThrow('NEXT_NOT_FOUND')
  })
  it.each(['awardees', 'profiles'])('does not fall back to legacy links if the %s consent lookup fails', async (table) => {
    fetchProfile.mockResolvedValue({ slug: 'amina-ali', name: 'Amina Ali', is_public: true, social_links: { website: 'https://legacy.example' } })
    admin.mockReturnValue({ from: (name: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => name === table
      ? { data: null, error: { message: 'unavailable' } }
      : { data: { profile_id: 'member-1' }, error: null } }) }) }) })
    await expect(Page({ params })).rejects.toThrow('Could not verify profile contact consent')
  })
  it('uses a canonical URL for public profiles', async () => {
    fetchProfile.mockResolvedValue({ slug: 'amina-ali', name: 'Amina Ali', is_public: true, bio: 'Leads education projects', year: 2026 })
    const metadata = await generateMetadata({ params })
    expect(metadata.alternates?.canonical).toBe('https://top100afl.com/awardees/amina-ali')
    expect(metadata.description).toContain('Amina Ali')
    expect(metadata.description).toContain('Leads education projects')
  })
})
