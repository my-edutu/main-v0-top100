import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/verify-captcha/route'

function request(body: unknown) {
  return new NextRequest('https://www.top100afl.com/api/verify-captcha', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

describe('login Turnstile verification', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('TURNSTILE_SECRET_KEY', 'test-secret')
    vi.stubEnv('TURNSTILE_HOSTNAMES', 'top100afl.com,www.top100afl.com')
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it.each([undefined, 42, '', 'x'.repeat(2049)])('rejects malformed token %s before contacting Cloudflare', async token => {
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect((await POST(request({ token }))).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('accepts a fresh token with the expected action and approved hostname', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true, hostname: 'www.top100afl.com', action: 'login' }))
    vi.stubGlobal('fetch', fetcher)
    const response = await POST(request({ token: 'fresh-token', action: 'login' }))
    expect(await response.json()).toEqual({ success: true })
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it.each([
    { success: true, hostname: 'attacker.example', action: 'login' },
    { success: true, hostname: 'www.top100afl.com', action: 'signup' },
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
  ])('rejects wrong context and already consumed tokens', async result => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result)))
    expect((await POST(request({ token: 'token', action: 'login' }))).status).toBe(400)
  })

  it('accepts older clients without an action during deployment rollout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, hostname: 'top100afl.com' })))
    expect((await POST(request({ token: 'legacy-token' }))).status).toBe(200)
  })

  it('fails closed when Cloudflare is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')))
    expect((await POST(request({ token: 'token' }))).status).toBe(503)
  })

  it('fails closed if the production secret is missing', async () => {
    vi.stubEnv('TURNSTILE_SECRET_KEY', '')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect((await POST(request({ token: 'token' }))).status).toBe(500)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
