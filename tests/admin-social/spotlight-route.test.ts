import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  load: vi.fn(),
  generate: vi.fn(),
}))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.access }))
vi.mock('@/lib/admin-social/server', () => ({ loadPublicAwardee: mocks.load }))
vi.mock('@/lib/admin-social/openai-caption', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/lib/admin-social/openai-caption')
  >()),
  createOpenAICaptionGenerator: () => ({ generate: mocks.generate }),
}))
vi.mock('@/lib/admin-social/publishing-provider', () => ({
  publishingConfiguration: () => [],
}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }))
import { POST } from '@/app/api/admin/social/spotlight/route'
import { SocialCaptionProviderError } from '@/lib/admin-social/openai-caption'
const id = '24c4f56b-f3d8-4f8a-81d8-a09509e04511'
const request = (body: unknown) =>
  new Request('https://top100afl.com/api/admin/social/spotlight', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never
beforeEach(() => {
  vi.clearAllMocks()
  mocks.access.mockResolvedValue({ user: { id: 'admin' } })
  mocks.load.mockResolvedValue({
    awardeeId: id,
    name: 'Amara',
    bio: 'Runs a community learning programme.',
    profileUrl: 'https://top100afl.com/awardees/amara',
    achievements: [],
  })
  mocks.generate.mockResolvedValue('A grounded impact feature.')
})
describe('AI awardee feature rewrite', () => {
  it('explains a rejected AI credential without exposing provider secrets', async () => {
    mocks.generate.mockRejectedValue(
      new SocialCaptionProviderError('provider_credentials'),
    )
    const response = await POST(
      request({ awardeeId: id, platform: 'linkedin' }),
    )
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({
      message: expect.stringContaining('Renew the configured API key'),
    })
  })
  it('rewrites only the selected channel using the editorial focus', async () => {
    const response = await POST(
      request({
        awardeeId: id,
        platform: 'linkedin',
        editorialFocus: 'Highlight access to community learning.',
      }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      captions: {
        linkedin:
          'A grounded impact feature.\n\nhttps://top100afl.com/awardees/amara',
      },
    })
    expect(mocks.generate).toHaveBeenCalledTimes(1)
    expect(mocks.generate).toHaveBeenCalledWith(
      expect.objectContaining({ bio: 'Runs a community learning programme.' }),
      'linkedin',
      'Highlight access to community learning.',
    )
  })
  it('rejects an oversized editorial focus before calling the provider', async () => {
    expect(
      (
        await POST(
          request({
            awardeeId: id,
            platform: 'x',
            editorialFocus: 'a'.repeat(801),
          }),
        )
      ).status,
    ).toBe(400)
    expect(mocks.generate).not.toHaveBeenCalled()
  })
})
