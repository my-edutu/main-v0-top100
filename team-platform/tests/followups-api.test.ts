import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiMember: vi.fn(),
  audit: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/api', () => {
  class ApiError extends Error {
    status: number
    constructor(message: string, status = 400) {
      super(message)
      this.status = status
    }
  }
  return {
    ApiError,
    apiMember: mocks.apiMember,
    audit: mocks.audit,
    jsonError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 400
      const message = error instanceof Error ? error.message : 'error'
      return Response.json({ error: message }, { status })
    },
  }
})

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))

import { POST } from '@/app/api/followups/route'

describe('follow-up API evidence guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiMember.mockResolvedValue({
      membership: { role: 'agent', team_id: '11111111-1111-4111-8111-111111111111' },
    })
  })

  it('rejects a manual successful email follow-up before any database write', async () => {
    const response = await POST(
      new Request('http://team.test/api/followups', {
        method: 'POST',
        body: JSON.stringify({
          awardeeId: '22222222-2222-4222-8222-222222222222',
          channel: 'email',
          outcome: 'email_sent',
          notes: 'Manual claim of delivery',
        }),
        headers: { 'content-type': 'application/json' },
      }),
    )

    expect(response.status).toBe(422)
    expect((await response.json()).error).toMatch(/provider evidence/i)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects a claimed qualifying call without useful notes before any database write', async () => {
    const response = await POST(
      new Request('http://team.test/api/followups', {
        method: 'POST',
        body: JSON.stringify({
          awardeeId: '22222222-2222-4222-8222-222222222222',
          channel: 'call',
          outcome: 'interested',
          notes: 'ok',
        }),
        headers: { 'content-type': 'application/json' },
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })
})
