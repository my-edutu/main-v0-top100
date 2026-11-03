import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  apiMember: vi.fn(),
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
    jsonError: (error: unknown) => {
      const status = error instanceof ApiError ? error.status : 400
      const message = error instanceof Error ? error.message : 'error'
      return Response.json({ error: message }, { status })
    },
  }
})

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))

import { POST } from '@/app/api/contact-attempts/route'

const teamId = '11111111-1111-4111-8111-111111111111'
const awardeeId = '22222222-2222-4222-8222-222222222222'
const actorId = '33333333-3333-4333-8333-333333333333'
const requestId = '44444444-4444-4444-8444-444444444444'

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://teams.top100afl.com/api/contact-attempts', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://teams.top100afl.com',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

describe('tracked contact attempt API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.TOP100_SITE_URL
    mocks.apiMember.mockResolvedValue({
      user: { id: actorId, email: 'rep@example.test' },
      membership: { role: 'agent', team_id: teamId },
    })
  })

  it('rejects cross-origin requests before reading member or service state', async () => {
    const response = await POST(
      request(
        { awardeeId, channel: 'call', requestId },
        { origin: 'https://evil.example.test' },
      ),
    )

    expect(response.status).toBe(403)
    expect(mocks.apiMember).not.toHaveBeenCalled()
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('strictly rejects client phone or evidence fields', async () => {
    const response = await POST(
      request({
        awardeeId,
        channel: 'whatsapp',
        requestId,
        phone: '+2348030000000',
        proof: true,
      }),
    )

    expect(response.status).toBe(400)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('rejects a noncanonical team origin port', async () => {
    const response = await POST(request({ awardeeId, channel: 'call', requestId }, { origin: 'https://teams.top100afl.com:444' }))
    expect(response.status).toBe(403)
    expect(mocks.apiMember).not.toHaveBeenCalled()
  })

  it('passes only server-owned attempt inputs to the service RPC and returns safe destinations', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        token: '66666666-6666-4666-8666-666666666666',
        channel: 'whatsapp',
        phone: '+2348030000000',
        rep_name: 'Ada Rep',
        status: 'initiated',
        initiated_at: '2026-11-03T07:00:00.000Z',
      },
      error: null,
    })
    mocks.createAdminClient.mockReturnValue({ rpc })

    const response = await POST(request({ awardeeId, channel: 'whatsapp', requestId }))
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(rpc).toHaveBeenCalledWith('team_begin_contact_attempt', {
      p_team_id: teamId,
      p_actor: actorId,
      p_awardee_id: awardeeId,
      p_channel: 'whatsapp',
      p_request_id: requestId,
    })
    expect(payload).toMatchObject({
      confirmationUrl: 'https://www.top100afl.com/contact-confirmation/66666666-6666-4666-8666-666666666666',
      destination: 'https://wa.me/2348030000000',
      attempt: { phone: '+2348030000000', rep_name: 'Ada Rep', channel: 'whatsapp' },
    })
  })

  it('does not allow an unauthorized or cross-assignment RPC result to become a proof link', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'contact attempt is not authorized' },
    })
    mocks.createAdminClient.mockReturnValue({ rpc })

    const response = await POST(request({ awardeeId, channel: 'call', requestId }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toMatch(/assigned/i)
  })
})
