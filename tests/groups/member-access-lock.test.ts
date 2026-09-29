import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ success: true })),
  createRateLimitResponse: vi.fn(),
}))

import { GET as listGroups, POST as createGroup } from '@/app/api/member/groups/route'
import { GET as getGroup } from '@/app/api/member/groups/[id]/route'
import { DELETE as deleteMessage, GET as listMessages, POST as postMessage } from '@/app/api/member/groups/[id]/messages/route'
import { DELETE as leaveGroup, PATCH as moderateMembership, POST as joinGroup } from '@/app/api/member/groups/[id]/membership/route'

const params = { params: Promise.resolve({ id: 'group-1' }) }
function request(method: string, url: string, body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  })
}

describe('member Groups feature lock', () => {
  beforeEach(() => {
    mocks.user.mockReset().mockResolvedValue({ id: 'member-1' })
    mocks.createAdminClient.mockReset()
  })

  it.each([
    ['list groups', () => listGroups()],
    ['create group', () => createGroup(request('POST', 'http://localhost/api/member/groups', {}))],
    ['read group details', () => getGroup(request('GET', 'http://localhost/api/member/groups/group-1'), params)],
    ['read messages', () => listMessages(request('GET', 'http://localhost/api/member/groups/group-1/messages'), params)],
    ['post a message', () => postMessage(request('POST', 'http://localhost/api/member/groups/group-1/messages', { body: 'Hello' }), params)],
    ['delete a message', () => deleteMessage(request('DELETE', 'http://localhost/api/member/groups/group-1/messages?messageId=message-1'), params)],
    ['join a group', () => joinGroup(request('POST', 'http://localhost/api/member/groups/group-1/membership'), params)],
    ['leave a group', () => leaveGroup(request('DELETE', 'http://localhost/api/member/groups/group-1/membership'), params)],
    ['moderate group membership', () => moderateMembership(request('PATCH', 'http://localhost/api/member/groups/group-1/membership', { profileId: 'member-2', status: 'active' }), params)],
  ])('blocks members from %s before accessing group data', async (_operation, run) => {
    const response = await run()
    expect(response.status).toBe(423)
    expect(await response.json()).toMatchObject({ locked: true, message: expect.any(String) })
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('still requires authentication before returning the locked response', async () => {
    mocks.user.mockResolvedValue(null)
    const response = await listGroups()
    expect(response.status).toBe(401)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })
})
