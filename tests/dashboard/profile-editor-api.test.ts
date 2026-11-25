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
describe('authenticated profile edits', () => {
  beforeEach(() => {
    m.rpc.mockReset()
    m.user.mockResolvedValue({ id: 'member-1' })
    m.rpc.mockResolvedValue({ data: { id: 'member-1', bio: 'New' }, error: null })
  })
  it('saves text when the legacy allowance is exhausted without incrementing it', async () => {
    const result = await PATCH(new NextRequest('https://www.top100afl.com/api/member/me', { method: 'PATCH', body: JSON.stringify({ bio: 'New', emailVisible: false }) }))
    expect(result.status).toBe(200)
    expect(m.rpc).toHaveBeenCalledWith('update_member_profile_atomic', expect.objectContaining({ p_profile_id: 'member-1', p_increment_bio: false, p_columns: { bio: 'New' } }))
  })
  it('still requires sign in', async () => {
    m.user.mockResolvedValue(null)
    expect((await PATCH(new NextRequest('https://www.top100afl.com/api/member/me', { method: 'PATCH' }))).status).toBe(401)
  })
  it('saves and returns career details through the restricted atomic update', async () => {
    const career = { name: 'Acme', type: 'startup', role: 'Founder', linkedinUrl: 'https://www.linkedin.com/company/acme/', isPublic: false }
    m.rpc.mockResolvedValue({ data: { id: 'member-1', career }, error: null })
    const result = await PATCH(new NextRequest('https://top100afl.com/api/member/me', {
      method: 'PATCH',
      body: JSON.stringify({ career: { ...career, name: ' Acme ', linkedinUrl: 'https://linkedin.com/company/acme/?trk=example' } }),
    }))
    expect(result.status).toBe(200)
    expect(m.rpc).toHaveBeenCalledWith('update_member_profile_with_career', {
      p_profile_id: 'member-1',
      p_increment_bio: false,
      p_columns: {},
      p_preference_patch: {},
      p_career: career,
    })
    expect((await result.json()).member.career).toEqual(career)
  })
  it.each([
    'https://www.linkedin.com/in/acme/',
    'https://linkedin.com.example.org/company/acme/',
    'https://www.linkedin.com/company/acme/jobs/',
    'http://www.linkedin.com/company/acme/',
  ])('rejects an invalid company page (%s)', async (linkedinUrl) => {
    const result = await PATCH(new NextRequest('https://top100afl.com/api/member/me', {
      method: 'PATCH',
      body: JSON.stringify({ career: { name: 'Acme', type: 'employer', role: '', linkedinUrl, isPublic: true } }),
    }))
    expect(result.status).toBe(400)
    expect(m.rpc).not.toHaveBeenCalled()
  })
})
