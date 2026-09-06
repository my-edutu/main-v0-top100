import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { rejectCrossOriginMutation } from '@/lib/security/same-origin'

function mutation(headers: Record<string, string> = {}) {
  return new NextRequest('https://internal-host.example/api/member/me', {
    method: 'PATCH',
    headers,
  })
}

describe('cookie-authenticated mutation origin checks', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('accepts a matching Origin header', () => {
    expect(
      rejectCrossOriginMutation(
        mutation({ cookie: 'sb-auth=token', origin: 'https://internal-host.example' }),
      ),
    ).toBeNull()
  })

  it('accepts the configured public origin behind an internal host', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://top100afl.com/')

    expect(
      rejectCrossOriginMutation(
        mutation({ cookie: 'sb-auth=token', origin: 'https://top100afl.com' }),
      ),
    ).toBeNull()
  })

  it('uses Referer when a browser omits Origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://top100afl.com')

    expect(
      rejectCrossOriginMutation(
        mutation({ cookie: 'sb-auth=token', referer: 'https://top100afl.com/dashboard/me' }),
      ),
    ).toBeNull()
  })

  it('rejects a cross-site cookie-authenticated request', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://top100afl.com')

    const response = rejectCrossOriginMutation(
      mutation({ cookie: 'sb-auth=token', origin: 'https://attacker.example' }),
    )

    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toEqual({ message: 'Cross-origin request blocked.' })
  })

  it('rejects cookie-authenticated requests with no browser origin evidence', () => {
    expect(rejectCrossOriginMutation(mutation({ cookie: 'sb-auth=token' }))?.status).toBe(403)
  })

  it('does not require an Origin for bearer-authenticated API clients', () => {
    expect(
      rejectCrossOriginMutation(mutation({ authorization: 'Bearer verified-token' })),
    ).toBeNull()
  })
})
