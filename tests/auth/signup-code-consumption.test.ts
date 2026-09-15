import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  consumeCode: vi.fn(),
  deleteUser: vi.fn(),
  from: vi.fn(),
}))

vi.mock('@/lib/access-codes', () => ({
  normalizeCode: (code: string) => code.trim().toUpperCase(),
  validateCode: vi.fn().mockResolvedValue({ ok: true, code: {} }),
  consumeCode: mocks.consumeCode,
}))
vi.mock('@/lib/auth/signup-turnstile', () => ({ verifySignupCaptcha: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/rate-limit', () => ({
  RATE_LIMITS: { AUTH: {} },
  checkRateLimit: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue('test-client'),
  createRateLimitResponse: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: mocks.from,
    auth: { admin: { createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null }), deleteUser: mocks.deleteUser } },
  }),
}))

import { POST } from '@/app/api/auth/signup/route'

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  for (const method of ['select', 'eq', 'is', 'update', 'insert', 'delete']) {
    chain[method] = vi.fn(() => chain)
  }
  chain.maybeSingle = vi.fn().mockResolvedValue(result)
  chain.then = vi.fn((resolve) => Promise.resolve(result).then(resolve))
  return chain
}

describe('signup access-code consumption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deleteUser.mockResolvedValue({ data: null, error: null })
  })

  it('rolls back the claimed profile when a single-use code loses a redemption race', async () => {
    const awardeeLookup = query({
      data: {
        id: 'awardee-id',
        name: 'Ada Awardee',
        email: 'awardee@example.com',
        slug: 'ada-awardee',
        country: 'Nigeria',
        course: 'Engineering',
        bio: null,
        image_url: null,
        profile_id: null,
      },
      error: null,
    })
    const profileInsert = query({ error: null })
    const awardeeClaim = query({ data: [{ id: 'awardee-id' }], error: null })
    const awardeeRollback = query({ data: [{ id: 'awardee-id' }], error: null })
    const profileDelete = query({ error: null })
    let awardeeCalls = 0

    mocks.from.mockImplementation((table: string) => {
      if (table === 'profiles') return profileInsert.insert.mock.calls.length ? profileDelete : profileInsert
      if (table === 'awardees') {
        awardeeCalls += 1
        return awardeeCalls === 1 ? awardeeLookup : awardeeCalls === 2 ? awardeeClaim : awardeeRollback
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mocks.consumeCode.mockResolvedValue(false)

    const response = await POST(new NextRequest('http://localhost:3100/api/auth/signup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        awardeeId: 'awardee-id',
        email: 'awardee@example.com',
        password: 'safe-password',
        inviteCode: 'AFL-READY',
      }),
    }))

    expect(response.status).toBe(409)
    expect(awardeeRollback.update).toHaveBeenCalledWith({ profile_id: null, email: 'awardee@example.com' })
    expect(mocks.deleteUser).toHaveBeenCalledWith('new-user-id')
  })
})
