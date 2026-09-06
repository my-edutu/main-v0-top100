import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  sessionUserId: null as string | null,
  queriedUserId: null as string | null,
  profile: { role: 'user' } as { role: string } | null,
  queryError: null as { message: string } | null,
}))

vi.mock('@/lib/auth-server', () => ({
  getServerSession: async () =>
    state.sessionUserId
      ? { token: 'verified-token', user: { id: state.sessionUserId } }
      : null,
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, value: string) => {
          state.queriedUserId = value
          return {
            maybeSingle: async () => ({ data: state.profile, error: state.queryError }),
          }
        },
      }),
    }),
  }),
}))

import { POST } from '@/app/api/auth/check-profile/route'

function request(body: Record<string, string> = {}) {
  return new NextRequest('https://top100afl.com/api/auth/check-profile', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://top100afl.com',
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth/check-profile', () => {
  beforeEach(() => {
    state.sessionUserId = 'session-user'
    state.queriedUserId = null
    state.profile = { role: 'user' }
    state.queryError = null
  })

  it('rejects requests without a verified session', async () => {
    state.sessionUserId = null

    const response = await POST(request({ userId: 'victim-user' }))

    expect(response.status).toBe(401)
    expect(state.queriedUserId).toBeNull()
  })

  it('looks up only the verified session user and returns only their role', async () => {
    const response = await POST(request({ userId: 'victim-user' }))

    expect(response.status).toBe(200)
    expect(state.queriedUserId).toBe('session-user')
    await expect(response.json()).resolves.toEqual({ profile: { role: 'user' } })
  })

  it('rejects an unrecognized database role', async () => {
    state.profile = { role: 'owner' }

    const response = await POST(request())

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({ error: 'Access denied.' })
  })
})
