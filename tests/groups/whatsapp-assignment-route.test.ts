import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  profile: vi.fn(),
  createAdminClient: vi.fn(),
  resolveAssignment: vi.fn(),
  rejectCrossOriginMutation: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/groups/server', () => ({ loadProfileForGroups: mocks.profile }))
vi.mock('@/lib/security/same-origin', () => ({
  rejectCrossOriginMutation: mocks.rejectCrossOriginMutation,
}))
vi.mock('@/lib/groups/whatsapp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/groups/whatsapp')>()
  return { ...actual, resolveWhatsAppGroupAssignment: mocks.resolveAssignment }
})

import { POST } from '@/app/api/member/whatsapp-group/route'

const approvedMember = { id: 'profile-1', membership_status: 'approved' }
const assignedGroup = {
  key: 'group-2',
  label: 'Group 2',
  inviteUrl: 'https://chat.whatsapp.com/F8p9rErOr6VAYGZbhaske8?mode=gi_t',
}

function request(body?: unknown) {
  return new NextRequest('http://localhost/api/member/whatsapp-group', {
    method: 'POST',
    headers: { origin: 'http://localhost', 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

describe('POST /api/member/whatsapp-group', () => {
  beforeEach(() => {
    mocks.user.mockReset().mockResolvedValue({ id: 'profile-1' })
    mocks.profile.mockReset().mockResolvedValue(approvedMember)
    mocks.createAdminClient.mockReset().mockReturnValue({})
    mocks.resolveAssignment.mockReset().mockResolvedValue({ group: assignedGroup, created: true })
    mocks.rejectCrossOriginMutation.mockReset().mockReturnValue(null)
  })

  it('rejects unauthenticated requests before opening a database client', async () => {
    mocks.user.mockResolvedValue(null)

    const response = await POST(request())

    expect(response.status).toBe(401)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('does not issue an assignment to a member whose approval is pending', async () => {
    mocks.profile.mockResolvedValue({ ...approvedMember, membership_status: 'pending' })

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(mocks.resolveAssignment).not.toHaveBeenCalled()
  })

  it('returns the server-resolved assignment and ignores submitted group data', async () => {
    const response = await POST(request({ profileId: 'another-member', groupKey: 'group-1', inviteUrl: 'https://evil.example' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ group: assignedGroup, created: true })
    expect(mocks.resolveAssignment).toHaveBeenCalledWith({}, 'profile-1', expect.any(Number))
  })

  it('returns a retryable setup response when the assignment table is missing', async () => {
    mocks.resolveAssignment.mockRejectedValue(Object.assign(
      new Error('relation public.whatsapp_group_assignments does not exist'),
      { code: '42P01' },
    ))

    const response = await POST(request())

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ setupRequired: true })
  })

  it('blocks a cross-origin cookie mutation before creating an assignment', async () => {
    mocks.rejectCrossOriginMutation.mockReturnValue(
      NextResponse.json({ message: 'Cross-origin request blocked.' }, { status: 403 }),
    )

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })
})
