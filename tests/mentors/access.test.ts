import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { approvedMentorMember, mentorAwardeeAccess } from '@/lib/mentors/server'

const { getUser, from } = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser } }),
  createAdminClient: () => ({ from }),
}))

function mockRecords(linked: boolean) {
  const eq = vi.fn()
  from.mockImplementation((table: string) => ({
    select: () => ({
      eq: (field: string, id: string) => {
        eq(table, field, id)
        const data = table === 'profiles'
          ? { membership_status: 'approved', account_status: 'active' }
          : linked ? { id: 'awardee-id' } : null
        const result = { maybeSingle: async () => ({ data, error: null }) }
        return { ...result, limit: () => result }
      },
    }),
  }))
  return eq
}

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'current-user', email_confirmed_at: '2026-11-10' } } })
})

afterEach(() => vi.unstubAllEnvs())

describe('mentor awardee access', () => {
  it('rejects approved members without a linked awardee record', async () => {
    vi.stubEnv('IMPACT_AFRICA_MEMBER_MENTORSHIP_ENABLED', 'true')
    mockRecords(false)
    await expect(mentorAwardeeAccess()).resolves.toBeNull()
    await expect(approvedMentorMember()).rejects.toThrow(/awardee/)
  })

  it('looks up the awardee record using the verified account ID', async () => {
    const eq = mockRecords(true)
    await expect(mentorAwardeeAccess()).resolves.toMatchObject({ user: { id: 'current-user' } })
    expect(eq).toHaveBeenCalledWith('awardees', 'profile_id', 'current-user')
  })

  it('does not show eligibility for signed-out visitors', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    await expect(mentorAwardeeAccess()).resolves.toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('keeps member actions locked even for a linked awardee', async () => {
    vi.stubEnv('IMPACT_AFRICA_MEMBER_MENTORSHIP_ENABLED', 'false')
    mockRecords(true)
    await expect(approvedMentorMember()).rejects.toThrow(/closed/)
    expect(from).not.toHaveBeenCalled()
  })
})
