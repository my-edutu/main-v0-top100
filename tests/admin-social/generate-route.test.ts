import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), loadPublicAwardee: vi.fn(), generate: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/admin-social/server', () => ({ loadPublicAwardee: mocks.loadPublicAwardee }))
vi.mock('@/lib/admin-social/openai-caption', () => ({
  SocialCaptionProviderError: class SocialCaptionProviderError extends Error {},
  createOpenAICaptionGenerator: () => ({ generate: mocks.generate }),
}))

import { POST } from '@/app/api/admin/social/generate/route'

function request(body: unknown) {
  return new Request('https://www.top100afl.com/api/admin/social/generate', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }) as never
}

describe('/api/admin/social/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
    mocks.loadPublicAwardee.mockResolvedValue({ awardeeId: 'awardee-1', name: 'Amara', bio: 'Public bio', isPublic: true })
    mocks.generate.mockResolvedValue('A generated draft.')
  })

  it('does not generate copy for non-admins', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: Response.json({ message: 'Admin access required.' }, { status: 403 }) })
    const response = await POST(request({ awardeeId: '24c4f56b-f3d8-4f8a-81d8-a09509e04511', platform: 'linkedin' }))
    expect(response.status).toBe(403)
    expect(mocks.generate).not.toHaveBeenCalled()
  })

  it('reloads public profile server-side and returns generated text only as a draft', async () => {
    const id = '24c4f56b-f3d8-4f8a-81d8-a09509e04511'
    const response = await POST(request({ awardeeId: id, platform: 'linkedin' }))
    expect(response.status).toBe(200)
    expect(mocks.loadPublicAwardee).toHaveBeenCalledWith(id, 'https://www.top100afl.com')
    expect(mocks.generate).toHaveBeenCalledWith(expect.objectContaining({ bio: 'Public bio' }), 'linkedin')
    await expect(response.json()).resolves.toMatchObject({ caption: 'A generated draft.', platform: 'linkedin' })
  })
})
