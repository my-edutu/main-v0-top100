import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  from: vi.fn(),
  approveClaim: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  sendMemberPush: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: mocks.from, rpc: mocks.approveClaim }) }))
vi.mock('@/lib/member-hub-server', () => ({ mapProfileToMember: (profile: unknown) => profile }))
vi.mock('@/lib/push/send', () => ({ sendMemberPush: mocks.sendMemberPush }))
vi.mock('@/lib/portfolio-cover/repository', () => ({ createPortfolioCoverRepository: () => ({ getLatest: vi.fn(), reset: vi.fn() }) }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath, revalidateTag: mocks.revalidateTag }))

import { PATCH } from '@/app/api/admin/members/[id]/route'

function request() {
  return new NextRequest('http://localhost/api/admin/members/member-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'approve' }),
  })
}

describe('individual awardee claim approval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
    mocks.approveClaim.mockResolvedValue({ error: null })
    mocks.sendMemberPush.mockResolvedValue(undefined)

    const pendingClaimQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'member-1' }, error: null }),
    }
    const approvedProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'member-1', role: 'user', membership_status: 'approved' }, error: null }),
    }
    const notificationQuery = { insert: vi.fn().mockResolvedValue({ error: null }) }
    mocks.from.mockImplementation((table: string) => {
      if (table === 'pending_awardee_claims') return pendingClaimQuery
      if (table === 'profiles') return approvedProfileQuery
      if (table === 'user_notifications') return notificationQuery
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('expires the awardee directory cache after approving an individual claim', async () => {
    const response = await PATCH(request(), { params: Promise.resolve({ id: 'member-1' }) })

    expect(response.status).toBe(200)
    expect(mocks.approveClaim).toHaveBeenCalledWith('approve_pending_awardee_claim', { p_user_id: 'member-1' })
    expect(mocks.revalidateTag).toHaveBeenCalledWith('awardees', { expire: 0 })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/awardees')
  })
})
