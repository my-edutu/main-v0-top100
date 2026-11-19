import { beforeEach, describe, expect, it, vi } from 'vitest'
import { editorialIssue, formatEditorialMaster, scoreEditorialReview, withEditorialLink } from '@/lib/admin-social/editorial'

const mocks = vi.hoisted(() => ({ load: vi.fn(), db: vi.fn(), adapt: vi.fn(), review: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: async () => ({ user: { id: 'admin' } }) }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.db }))
vi.mock('@/lib/admin-social/server', () => ({ loadPublicAwardee: mocks.load }))
vi.mock('@/lib/admin-social/spotlight-snapshot', () => ({ spotlightSignature: () => 'a'.repeat(64) }))
vi.mock('@/lib/admin-social/editorial-provider', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/admin-social/editorial-provider')>(),
  adaptEditorialMaster: mocks.adapt,
  reviewEditorial: mocks.review,
}))

import { POST } from '@/app/api/admin/social/editorial/route'

const id = '24c4f56b-f3d8-4f8a-81d8-a09509e04511'
const revision = 'e3557465-d278-4bc1-83e4-fc340d74f54e'
const signature = 'a'.repeat(64)
const profileUrl = 'https://top100afl.com/awardees/amara'
const profile = { name: 'Amara Okafor', bio: 'Started a reading club.', profileUrl }
const prose = 'AFL spotlights Amara Okafor for starting a reading club.'
const story = formatEditorialMaster('Amara started a reading club.', profileUrl, profile.name)
const passing = { announcement: true, storytelling: true, factualAccuracy: true, mission: true, profileCta: true, readability: true, feedback: 'The copy matches the source.' }
const post = (payload: object) => POST(new Request('https://top100afl.com/api/admin/social/editorial', {
  method: 'POST', body: JSON.stringify({ awardeeId: id, signature, ...payload }),
}) as never)

function mockStore(approval: object | null) {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: approval, error: null }),
    insert: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { revision, story }, error: null }),
  }
  mocks.db.mockReturnValue({ from: () => query })
  return query
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.load.mockResolvedValue(profile)
  mocks.adapt.mockResolvedValue(prose)
  mocks.review.mockResolvedValue(passing)
})

describe('AFL editorial approvals', () => {
  it('adds the canonical URL and rejects biographies without an announcement', () => {
    const output = withEditorialLink(prose + ' https://example.com/imposter', profileUrl)
    expect(output).not.toContain('example.com')
    expect(editorialIssue(output, profileUrl, profile.name, 'linkedin')).toBeNull()
    expect(editorialIssue(withEditorialLink('Amara Okafor started a reading club.', profileUrl), profileUrl, profile.name, 'linkedin')).toMatch(/announcing/)
  })

  it('adds the exact Meet heading and keeps hashtags out of the master', () => {
    const text = formatEditorialMaster('## Meet Amara Okafor\n\nAmara started a reading club.\n\n#Education #Top100AfricaFutureLeaders', profileUrl, profile.name)
    expect(text).toBe(`Meet Amara Okafor\n\nAmara started a reading club.\n\nExplore the official Top100 Africa Future Leaders profile:\n\n${profileUrl}`)
    expect(editorialIssue(text, profileUrl, profile.name)).toBeNull()
    expect(editorialIssue(text.replace('Meet ', 'Spotlight on '), profileUrl, profile.name)).toMatch(/Meet Amara Okafor/)
    expect(editorialIssue(text + '\n\n#Education', profileUrl, profile.name)).toMatch(/hashtags/i)
  })

  it('rejects adaptation without the requested approved revision', async () => {
    mockStore(null)
    expect((await post({ action: 'adapt', revision, platform: 'linkedin' })).status).toBe(409)
    expect(mocks.adapt).not.toHaveBeenCalled()
    mockStore({ revision, source_signature: 'b'.repeat(64), story })
    expect((await post({ action: 'adapt', revision, platform: 'linkedin' })).status).toBe(409)
    expect(mocks.adapt).not.toHaveBeenCalled()
  })

  it('blocks approval when the quality check finds unsupported claims', async () => {
    const store = mockStore(null)
    mocks.review.mockResolvedValue({ ...passing, factualAccuracy: false, feedback: 'A claim is unsupported.' })
    const response = await post({ action: 'approve', story, expectedRevision: null })
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ review: { score: 80, passes: false } })
    expect(store.insert).not.toHaveBeenCalled()
  })

  it('records the reviewed story and returns a checked adaptation from that story', async () => {
    const store = mockStore(null)
    expect((await post({ action: 'approve', story, expectedRevision: null })).status).toBe(200)
    expect(store.insert).toHaveBeenCalledWith(expect.objectContaining({ story, source_signature: signature, approved_by: 'admin' }))
    mockStore({ revision, source_signature: signature, story })
    const response = await post({ action: 'adapt', revision, platform: 'x' })
    expect(response.status).toBe(200)
    expect(mocks.adapt).toHaveBeenCalledWith(profile, story, 'x')
    expect(await response.json()).toMatchObject({ revision, review: { score: scoreEditorialReview(passing), passes: true }, story: expect.stringContaining(profileUrl) })
  })
})
