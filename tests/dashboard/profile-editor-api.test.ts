import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const m = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: m.user }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({
  from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'profiles' ? { id: 'member-1', bio: 'Old', bio_update_count: 2, bio_update_limit: 2, notification_prefs: {} } : null, error: null }) }) }) }),
  rpc: m.rpc,
}) }))
import { PATCH } from '@/app/api/member/me/route'
describe('unlimited authenticated BIO edits', () => {
  beforeEach(() => { m.user.mockResolvedValue({ id: 'member-1' }); m.rpc.mockResolvedValue({ data: { id: 'member-1', bio: 'New' }, error: null }) })
  it('saves text when the legacy allowance is exhausted without incrementing it', async () => {
    const result = await PATCH(new NextRequest('https://www.top100afl.com/api/member/me', { method: 'PATCH', body: JSON.stringify({ bio: 'New', emailVisible: false }) }))
    expect(result.status).toBe(200)
    expect(m.rpc).toHaveBeenCalledWith('update_member_profile_atomic', expect.objectContaining({ p_profile_id: 'member-1', p_increment_bio: false, p_columns: { bio: 'New' } }))
  })
  it('still requires sign in', async () => {
    m.user.mockResolvedValue(null)
    expect((await PATCH(new NextRequest('https://www.top100afl.com/api/member/me', { method: 'PATCH' }))).status).toBe(401)
  })
})
