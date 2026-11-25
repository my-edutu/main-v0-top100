import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, GET, PUT } from '@/app/api/member/founders/route'

const mock = vi.hoisted(() => ({
  user: vi.fn(), profile: vi.fn(), table: vi.fn(), upsert: vi.fn(), remove: vi.fn(), removeEq: vi.fn(),
  select: vi.fn(), filter: vi.fn(), order: vi.fn(), range: vi.fn(),
}))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mock.user }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({
  from: (name: string) => name === 'profiles'
    ? { select: () => ({ eq: () => ({ maybeSingle: mock.profile }) }) }
    : mock.table(name),
}) }))

const url = 'https://top100afl.com/api/member/founders'
const listing = { startup: 'Field Studio', summary: 'We build tools for farmers.', linkedinUrl: 'https://linkedin.com/in/founder?trk=example' }

beforeEach(() => {
  vi.clearAllMocks()
  mock.user.mockResolvedValue({ id: 'verified-member' })
  mock.profile.mockResolvedValue({ data: { membership_status: 'approved' }, error: null })
  mock.table.mockReturnValue({ upsert: mock.upsert, delete: mock.remove, select: mock.select })
  mock.upsert.mockResolvedValue({ error: null })
  mock.remove.mockReturnValue({ eq: mock.removeEq })
  mock.removeEq.mockResolvedValue({ error: null })
  mock.select.mockReturnValue({ eq: mock.filter })
  mock.filter.mockReturnValue({ order: mock.order })
  mock.order.mockReturnValue({ order: mock.order, range: mock.range })
})

describe('Founders Network', () => {
  it('only lists entries with approved founders and returns the permitted fields', async () => {
    mock.range.mockResolvedValue({ data: [{
      profile_id: 'founder-1', startup: listing.startup, summary: listing.summary,
      linkedin_url: 'https://www.linkedin.com/in/founder/', founder: { full_name: 'Amina', email: 'hidden@example.com' },
    }], error: null })
    const result = await GET(new NextRequest(url))
    expect(mock.filter).toHaveBeenCalledWith('founder.membership_status', 'approved')
    expect(await result!.json()).toEqual({ entries: [{
      profileId: 'founder-1', startup: listing.startup, summary: listing.summary,
      linkedinUrl: 'https://www.linkedin.com/in/founder/', founderName: 'Amina',
    }], hasNextPage: false })
  })

  it('blocks unapproved accounts before querying listings', async () => {
    mock.profile.mockResolvedValue({ data: { membership_status: 'pending' }, error: null })
    expect((await GET(new NextRequest(url)))?.status).toBe(403)
    expect(mock.table).not.toHaveBeenCalled()
  })

  it('uses the signed-in member for submitting and removing a listing', async () => {
    const response = await PUT(new NextRequest(url, { method: 'PUT', body: JSON.stringify({ ...listing, profileId: 'another-member' }) }))
    expect(response?.status).toBe(200)
    expect(mock.upsert).toHaveBeenCalledWith({
      profile_id: 'verified-member', startup: listing.startup, summary: listing.summary, linkedin_url: 'https://www.linkedin.com/in/founder/',
    }, { onConflict: 'profile_id' })
    expect((await DELETE())?.status).toBe(200)
    expect(mock.removeEq).toHaveBeenCalledWith('profile_id', 'verified-member')
  })

  it.each(['https://linkedin.com/company/startup/', 'https://linkedin.com.example.org/in/founder/', 'javascript:alert(1)'])(
    'rejects links that are not a founder LinkedIn profile (%s)', async linkedinUrl => {
      const result = await PUT(new NextRequest(url, { method: 'PUT', body: JSON.stringify({ ...listing, linkedinUrl }) }))
      expect(result?.status).toBe(400)
      expect(mock.upsert).not.toHaveBeenCalled()
    },
  )
})
