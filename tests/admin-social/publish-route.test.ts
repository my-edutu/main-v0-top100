import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), load: vi.fn(), db: vi.fn(), send: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/admin-social/server', () => ({ loadPublicAwardee: mocks.load }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.db }))
vi.mock('@/lib/site', () => ({ SITE_URL: 'https://top100afl.com' }))
vi.mock('@/lib/admin-social/publishing-provider', () => ({ publishingConfiguration: () => [{ platform: 'x', configured: false }], createSocialPublisher: () => mocks.send }))
import { POST } from '@/app/api/admin/social/publish/route'
import { spotlightSignature } from '@/lib/admin-social/spotlight-snapshot'
import type { PublicAwardee } from '@/lib/admin-social/types'
const id = '24c4f56b-f3d8-4f8a-81d8-a09509e04511'
const profile = { awardeeId: id, name: 'Amara', bio: 'Clean energy', profileUrl: 'https://top100afl.com/awardees/amara', imageUrl: 'https://example.com/image.jpg' } as PublicAwardee
const caption = `Meet Amara. ${profile.profileUrl}`
const valid = () => ({ awardeeId: id, signature: spotlightSignature(profile), captions: { linkedin: caption, facebook: caption, instagram: caption, x: caption } })
const request = (body: unknown) => new Request('https://top100afl.com/api/admin/social/publish', { method: 'POST', body: JSON.stringify(body) }) as never
beforeEach(() => { vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin' } }); mocks.load.mockResolvedValue(profile) })
describe('publish API preflight', () => {
  it('rejects non-admins before loading profiles or contacting providers', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: Response.json({}, { status: 403 }) })
    expect((await POST(request(valid()))).status).toBe(403)
    expect(mocks.load).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('rejects stale profile previews', async () => {
    expect((await POST(request({ ...valid(), signature: 'a'.repeat(64) }))).status).toBe(409)
    expect(mocks.db).not.toHaveBeenCalled()
  })
  it('requires every platform and its canonical profile link', async () => {
    const input = valid(); input.captions.x = 'No profile link'
    expect((await POST(request(input))).status).toBe(422)
    expect((await POST(request({ ...valid(), captions: { linkedin: caption } }))).status).toBe(400)
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('does not start a partial broadcast when account setup is missing', async () => {
    const response = await POST(request(valid()))
    expect(response.status).toBe(503)
    expect(mocks.db).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })
})
