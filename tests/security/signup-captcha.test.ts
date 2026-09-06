import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const adminClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: adminClient }))

import { POST } from '@/app/api/auth/signup/route'

describe('signup CAPTCHA production boundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    adminClient.mockReset()
  })

  it('rejects signup before database access when the production CAPTCHA secret is absent', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    adminClient.mockImplementation(() => {
      throw new Error('database must not be reached')
    })

    const response = await POST(
      new NextRequest('https://top100afl.com/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.2' },
        body: JSON.stringify({
          email: 'awardee@example.com',
          password: 'safe-password',
          inviteCode: 'AFL-READY',
          awardeeId: '00000000-0000-4000-8000-000000000000',
        }),
      }),
    )

    expect(response.status).toBe(400)
    expect(adminClient).not.toHaveBeenCalled()
  })
})
