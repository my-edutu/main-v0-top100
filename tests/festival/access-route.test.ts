import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  user: { id: 'member-1' } as { id: string } | null,
  status: 'approved',
  dbError: null as null | { message: string },
  read: vi.fn(),
  save: vi.fn(),
}))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: async () => state.user }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: () => ({ select: () => ({ eq: () => ({
    maybeSingle: async () => ({ data: { membership_status: state.status }, error: state.dbError }),
  }) }) }) }),
}))
vi.mock('@/lib/festival/server', () => ({ readFestivalInterest: state.read, saveFestivalInterest: state.save }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: async () => ({ success: true }), createRateLimitResponse: vi.fn(), RATE_LIMITS: { AUTH: {} },
}))
import { GET, POST } from '@/app/api/member/festival-interest/route'

describe('festival awardee access', () => {
  beforeEach(() => {
    state.user = { id: 'member-1' }
    state.status = 'approved'
    state.dbError = null
    state.read.mockReset().mockResolvedValue({ interest: null, payment: 'required' })
    state.save.mockReset().mockResolvedValue({ interest: null, payment: 'required' })
  })
  it('requires authentication', async () => {
    state.user = null
    expect((await GET()).status).toBe(401)
  })
  it.each(['pending', 'rejected', 'suspended'])('blocks %s accounts from reading or saving festival details', async status => {
    state.status = status
    expect((await GET()).status).toBe(403)
    expect((await POST(new Request('http://localhost/api/member/festival-interest', { method: 'POST' }))).status).toBe(403)
    expect(state.read).not.toHaveBeenCalled()
    expect(state.save).not.toHaveBeenCalled()
  })
  it('fails closed when eligibility cannot be checked', async () => {
    state.dbError = { message: 'offline' }
    expect((await GET()).status).toBe(503)
    expect(state.read).not.toHaveBeenCalled()
  })
  it('allows approved awardees to read their interest', async () => {
    expect((await GET()).status).toBe(200)
  })
})
