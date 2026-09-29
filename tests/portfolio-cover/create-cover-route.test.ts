import { beforeEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'

const mocks = vi.hoisted(() => ({
  user: { id: 'member-1' } as { id: string } | null,
  uploaded: vi.fn(),
  profileUpdate: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: vi.fn(async () => mocks.user) }))
vi.mock('@/lib/security/same-origin', () => ({ rejectCrossOriginMutation: vi.fn(() => null) }))
vi.mock('@/lib/awards/access-server', () => ({ hasConfirmedAwardPayment: vi.fn(async () => true) }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true, limit: 10, remaining: 9, reset: Date.now() + 300_000 })),
  createRateLimitResponse: vi.fn(),
  getClientIdentifier: vi.fn(() => '127.0.0.1'),
  RATE_LIMITS: { UPLOAD: { maxRequests: 10, windowSeconds: 300 } },
}))
vi.mock('@/lib/media/storage', () => ({ uploadMedia: mocks.uploaded }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { full_name: 'Amara Okafor' }, error: null }) }) }),
      update: (patch: unknown) => ({ eq: (column: string, value: string) => mocks.profileUpdate(patch, column, value) }),
    }),
  })),
}))

import { POST } from '@/app/api/member/portfolio-cover/generations/route'

describe('POST /api/member/portfolio-cover/generations (template cover upload)', () => {
  beforeEach(() => {
    mocks.user = { id: 'member-1' }
    mocks.uploaded.mockReset().mockResolvedValue({ path: 'member-1/cover.png', publicUrl: 'https://media.example/member-1/cover.png' })
    mocks.profileUpdate.mockReset().mockResolvedValue({ error: null })
  })

  it('renders and saves the uploaded portrait in the AFL template without AI or gender inputs', async () => {
    const photo = await sharp({ create: { width: 80, height: 120, channels: 3, background: '#d02080' } }).png().toBuffer()
    const form = new FormData()
    form.set('portrait', new File([photo], 'portrait.png', { type: 'image/png' }))
    form.set('consent', 'true')
    form.set('fields', JSON.stringify({ name: 'Amara Okafor' }))

    const response = await POST(new Request('https://www.top100afl.com/api/member/portfolio-cover/generations', { method: 'POST', body: form }) as never)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.coverUrl).toMatch(/^https:\/\/media\.example\/member-1\/cover\.png\?v=\d+$/)
    expect(mocks.uploaded).toHaveBeenCalledWith(expect.objectContaining({
      bucket: 'portfolio-covers',
      path: 'member-1/afl-2026-cover.png',
      contentType: 'image/png',
      upsert: true,
    }))
    const uploadedPng = mocks.uploaded.mock.calls[0][0].body as Buffer
    expect(await sharp(uploadedPng).metadata()).toMatchObject({ width: 1080, height: 1350 })
    expect(mocks.profileUpdate).toHaveBeenCalledWith({ portfolio_cover_url: body.coverUrl }, 'id', 'member-1')
  }, 15000)

  it('requires an authenticated awardee before saving a cover', async () => {
    mocks.user = null
    const response = await POST(new Request('https://www.top100afl.com/api/member/portfolio-cover/generations', { method: 'POST' }) as never)

    expect(response.status).toBe(401)
    expect(mocks.uploaded).not.toHaveBeenCalled()
  })
})
