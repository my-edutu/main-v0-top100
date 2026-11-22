import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ user: vi.fn(), access: vi.fn(), client: {} }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/award-letters/access', () => ({ getAwardLetterAccess: mocks.access }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => mocks.client }))

import { GET } from '@/app/api/member/recommendation-letters/recommender/route'

describe('member recommender details', () => {
  beforeEach(() => vi.resetAllMocks())

  it('requires a signed-in member', async () => {
    mocks.user.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ message: 'Sign in to view recommender details.' })
    expect(mocks.access).not.toHaveBeenCalled()
  })

  it('requires award-letter eligibility', async () => {
    mocks.user.mockResolvedValue({ id: 'member-1' })
    mocks.access.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ message: 'Recommender details are available to Top100 awardees.' })
    expect(mocks.access).toHaveBeenCalledWith(mocks.client, 'member-1')
  })

  it('returns the official work contact in a private, uncached response', async () => {
    mocks.user.mockResolvedValue({ id: 'member-1' })
    mocks.access.mockResolvedValue({ year: '2026' })
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({
      name: 'Nwosu Paul Light',
      title: 'Founder & CEO',
      organisation: 'Top100 Africa Future Leaders',
      email: 'partnership@top100afl.com',
      website: 'https://www.top100afl.com',
    })
  })
})
