import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requireAdmin, createAdminClient } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient }))

import { POST } from '@/app/api/admin/users/invite/route'

function request(body: Record<string, unknown>) {
  return new NextRequest('https://www.top100afl.com/api/admin/users/invite', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/admin/users/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAdmin.mockResolvedValue({ user: { id: 'inviter-1' }, profile: { role: 'admin' } })
  })

  it('invites the email and provisions an admin profile', async () => {
    const inviteUserByEmail = vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null })
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: { id: 'new-user-1' }, error: null }) }) })
    createAdminClient.mockReturnValue({ auth: { admin: { inviteUserByEmail } }, from: () => ({ upsert }) })

    const response = await POST(request({ email: 'new.admin@example.com', fullName: 'Ada Admin' }))

    expect(response.status).toBe(201)
    expect(inviteUserByEmail).toHaveBeenCalledWith('new.admin@example.com', {
      data: { full_name: 'Ada Admin', role: 'admin' },
      redirectTo: 'https://www.top100afl.com/auth/update-password?source=admin',
    })
    expect(upsert).toHaveBeenCalledWith({ id: 'new-user-1', email: 'new.admin@example.com', full_name: 'Ada Admin', role: 'admin' }, { onConflict: 'id' })
  })

  it('deletes the invited auth user if the admin profile cannot be provisioned', async () => {
    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    const inviteUserByEmail = vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-2' } }, error: null })
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: vi.fn().mockResolvedValue({ data: null, error: { message: 'profile failed' } }) }) })
    createAdminClient.mockReturnValue({ auth: { admin: { inviteUserByEmail, deleteUser } }, from: () => ({ upsert }) })

    const response = await POST(request({ email: 'broken.admin@example.com' }))

    expect(response.status).toBe(500)
    expect(deleteUser).toHaveBeenCalledWith('new-user-2')
  })

  it('rejects requests from non-admin callers before touching Supabase', async () => {
    requireAdmin.mockResolvedValue({ error: Response.json({ message: 'Admin access required' }, { status: 403 }) })
    const response = await POST(request({ email: 'blocked@example.com' }))

    expect(response.status).toBe(403)
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
