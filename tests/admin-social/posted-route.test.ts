import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))

import { PATCH } from '@/app/api/admin/social/drafts/[id]/route'

const draftId = 'f55b32aa-0373-48e8-9bd3-08f9bde1f412'
function request(body: unknown) {
  return new Request(`https://www.top100afl.com/api/admin/social/drafts/${draftId}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }) as never
}

describe('PATCH /api/admin/social/drafts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
  })

  it('rejects an invalid external post URL before privileged database access', async () => {
    const response = await PATCH(request({ publicPostUrl: 'javascript:alert(1)' }), { params: Promise.resolve({ id: draftId }) })
    expect(response.status).toBe(400)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('records posting only after an explicit admin action and scopes update to a draft', async () => {
    const savedRow = {
      id: draftId, awardee_id: 'awardee-1', profile_id: null, platform: 'linkedin', caption: 'Draft', status: 'marked_posted',
      snapshot_name: 'Amara', snapshot_bio: 'BIO', snapshot_profile_url: 'https://top100afl.com/awardees/amara',
      snapshot_image_url: null, snapshot_image_source: 'none', created_by: 'admin-1', updated_by: 'admin-1',
      created_at: '2026-09-26T00:00:00.000Z', updated_at: '2026-09-26T00:00:00.000Z',
      marked_posted_by: 'admin-1', marked_posted_at: '2026-09-26T00:00:00.000Z', public_post_url: null,
    }
    const query = {
      update: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: savedRow, error: null }),
    }
    mocks.createAdminClient.mockReturnValue({ from: vi.fn().mockReturnValue(query) })
    const response = await PATCH(request({ publicPostUrl: null }), { params: Promise.resolve({ id: draftId }) })
    expect(response.status).toBe(200)
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'marked_posted', marked_posted_by: 'admin-1', public_post_url: null }))
    expect(query.eq).toHaveBeenCalledWith('status', 'draft')
    await expect(response.json()).resolves.toMatchObject({ draft: { status: 'marked_posted', markedPostedBy: 'admin-1' } })
  })
})
