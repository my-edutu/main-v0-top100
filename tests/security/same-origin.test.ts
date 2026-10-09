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

  it('accepts the browser-facing loopback origin when Next uses an internal dev URL', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const request = new NextRequest('http://localhost:3000/api/auth/check-profile', {
      method: 'POST',
      headers: {
        cookie: 'sb-auth=token',
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:3000',
        'sec-fetch-site': 'same-origin',
      },
    })

    expect(rejectCrossOriginMutation(request)).toBeNull()
  })

  it('still rejects a cross-site request with a forged loopback host', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const request = new NextRequest('http://localhost:3000/api/auth/check-profile', {
      method: 'POST',
      headers: {
        cookie: 'sb-auth=token',
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:3000',
        'sec-fetch-site': 'cross-site',
      },
    })

    expect(rejectCrossOriginMutation(request)?.status).toBe(403)
  })

  it('accepts the configured public origin behind an internal host', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://top100afl.com/')

    expect(
      rejectCrossOriginMutation(
        mutation({ cookie: 'sb-auth=token', origin: 'https://top100afl.com' }),
      ),
    ).toBeNull()
  })

  it('accepts the runtime-configured public origin behind a reverse proxy', () => {
    vi.stubEnv('TOP100_SITE_URL', 'https://www.top100afl.com')

    expect(
      rejectCrossOriginMutation(
        mutation({ cookie: 'sb-auth=token', origin: 'https://www.top100afl.com' }),
      ),
    ).toBeNull()
  })

  it.each(['https://top100afl.com', 'https://www.top100afl.com'])(
    'accepts the built-in production origin %s when proxy env is missing',
    (origin) => {
      vi.stubEnv('TOP100_SITE_URL', '')
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')

      expect(
        rejectCrossOriginMutation(mutation({ cookie: 'sb-auth=token', origin })),
      ).toBeNull()
    },
  )

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
  it.each([['https://top100afl.com', 'https://www.top100afl.com'], ['https://www.top100afl.com', 'https://top100afl.com']])('accepts both production domains behind the proxy: %s', (configured, origin) => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', configured)
    expect(rejectCrossOriginMutation(mutation({ cookie: 'sb-auth=token', origin }))).toBeNull()
  })
  it('does not allow an unrelated subdomain or lookalike domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://top100afl.com')
    for (const origin of ['https://evil.top100afl.com', 'https://www.top100afl.com.attacker.example']) {
      expect(rejectCrossOriginMutation(mutation({ cookie: 'sb-auth=token', origin }))?.status).toBe(403)
    }
  })

})
