import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/security/same-origin', () => ({ rejectCrossOriginMutation: () => null }))

import { PUT, DELETE } from '@/app/api/users/route'

function request(method: 'PUT' | 'DELETE', body?: Record<string, unknown>) {
  const url = method === 'DELETE'
    ? 'https://www.top100afl.com/api/users?id=member-1'
    : 'https://www.top100afl.com/api/users'
  return new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

function makeClient(options: {
  role?: string
  status?: string
  writeError?: boolean
  rollbackError?: boolean
}) {
  const updateUserById = vi.fn()
    .mockResolvedValueOnce({ error: null })
    .mockResolvedValueOnce({ error: options.rollbackError ? { message: 'rollback unavailable' } : null })
  const selectTarget = vi.fn(() => ({
    eq: () => ({
      maybeSingle: async () => ({
        data: { role: options.role ?? 'user', account_status: options.status ?? 'active' },
        error: null,
      }),
    }),
  }))
  const update = vi.fn((updates: Record<string, unknown>) => ({
    eq: () => updates.account_status === 'deleted'
      ? Promise.resolve({ error: options.writeError ? { message: 'database unavailable' } : null })
      : {
          select: () => ({
            single: async () => ({
              data: options.writeError ? null : {
                id: 'member-1', role: 'user', account_status: updates.account_status,
              },
              error: options.writeError ? { message: 'database unavailable' } : null,
            }),
          }),
        },
  }))
  mocks.createAdminClient.mockReturnValue({
    auth: { admin: { updateUserById } },
    from: () => ({ select: selectTarget, update }),
  })
  return { updateUserById, update }
}

describe('admin account-state consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({
      user: { id: 'staff-1' },
      profile: { role: 'superadmin' },
    })
  })

  it('reverses a temporary authentication ban when suspension fails in the database', async () => {
    const { updateUserById } = makeClient({ writeError: true })
    const response = await PUT(request('PUT', { id: 'member-1', status: 'inactive' }))
    expect(response.status).toBe(500)
    expect(updateUserById).toHaveBeenNthCalledWith(1, 'member-1', { ban_duration: '876000h' })
    expect(updateUserById).toHaveBeenNthCalledWith(2, 'member-1', { ban_duration: 'none' })
  })

  it('surfaces reconciliation needs when rollback is unsuccessful', async () => {
    const { updateUserById } = makeClient({ writeError: true, rollbackError: true })
    const response = await PUT(request('PUT', { id: 'member-1', status: 'inactive' }))
    expect(response.status).toBe(503)
    expect((await response.json()).message).toContain('reconciliation')
    expect(updateUserById).toHaveBeenCalledTimes(2)
  })

  it('prevents ordinary admins from elevating new administrators', async () => {
    mocks.requireAdmin.mockResolvedValue({
      user: { id: 'staff-1' },
      profile: { role: 'admin' },
    })
    const { updateUserById, update } = makeClient({})
    const response = await PUT(request('PUT', { id: 'member-1', role: 'admin' }))
    expect(response.status).toBe(403)
    expect(update).not.toHaveBeenCalled()
    expect(updateUserById).not.toHaveBeenCalled()
  })

  it('restores the previous ban state if soft deletion fails', async () => {
    const { updateUserById } = makeClient({ writeError: true, status: 'active' })
    const response = await DELETE(request('DELETE'))
    expect(response.status).toBe(500)
    expect(updateUserById).toHaveBeenNthCalledWith(1, 'member-1', { ban_duration: '876000h' })
    expect(updateUserById).toHaveBeenNthCalledWith(2, 'member-1', { ban_duration: 'none' })
  })
})
