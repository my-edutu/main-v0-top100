import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('@/lib/auth-server', () => ({ getServerSession: mocks.session }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/rate-limit', () => ({
  rateLimitResponse: vi.fn().mockResolvedValue(null),
  getClientIdentifier: vi.fn().mockReturnValue('test'),
}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))

import { POST } from '@/app/api/auth/signup/route'

const awardeeId = '00000000-0000-4000-8000-000000000001'
function request() {
  return new NextRequest('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ awardeeId, inviteCode: 'AFL-READY' }),
  })
}

describe('verified winner claim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rpc.mockResolvedValue({ data: { awardeeId }, error: null })
  })

  it('rejects an account whose email has not been verified', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'user-1', email: 'ada@example.com', rawPayload: {} } })
    expect((await POST(request())).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('passes only the verified session identity to the atomic claim function', async () => {
    mocks.session.mockResolvedValue({ user: { id: 'user-1', email: 'ADA@example.com', rawPayload: { email_confirmed_at: '2026-09-28T00:00:00Z' } } })
    expect((await POST(request())).status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('claim_verified_awardee', {
      p_awardee_id: awardeeId,
      p_user_id: 'user-1',
      p_email: 'ada@example.com',
      p_code: 'AFL-READY',
    })
  })
})
