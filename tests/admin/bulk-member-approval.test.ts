import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), rpc: vi.fn(), revalidateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock('next/cache', () => ({ revalidateTag: mocks.revalidateTag, revalidatePath: mocks.revalidatePath }))

import { POST } from '@/app/api/admin/members/route'

function request(action = 'approve-all-pending') {
  return new NextRequest('http://localhost/api/admin/members', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
  })
}

describe('bulk member and claim approval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
    mocks.rpc.mockResolvedValue({ data: { approved: 249, approvedClaims: 248, approvedMembers: 1, skippedClaims: 0 }, error: null })
  })

  it('approves claims and ordinary members under the authenticated administrator', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('approve_all_pending_members_and_claims', { p_admin_id: 'admin-1' })
    expect(await response.json()).toEqual({ approved: 249, approvedClaims: 248, approvedMembers: 1, skippedClaims: 0 })
    expect(mocks.revalidateTag).toHaveBeenCalledWith('awardees', { expire: 0 })
  })

  it('reports conflicting claims rather than presenting them as approved', async () => {
    mocks.rpc.mockResolvedValue({ data: { approved: 2, approvedClaims: 2, approvedMembers: 0, skippedClaims: 1 }, error: null })
    expect(await (await POST(request())).json()).toMatchObject({ approved: 2, skippedClaims: 1 })
  })

  it('rejects non-admin requests before touching the database', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: NextResponse.json({ message: 'Admin access required' }, { status: 403 }) })
    expect((await POST(request())).status).toBe(403)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejects unknown actions', async () => {
    expect((await POST(request('suspend-all'))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('returns a failure if the bulk database operation fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '23505' } })
    expect((await POST(request())).status).toBe(500)
    expect(mocks.revalidateTag).not.toHaveBeenCalled()
  })
})
