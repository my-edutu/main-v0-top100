import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEV_DASHBOARD_COOKIE, DEV_DASHBOARD_COOKIE_VALUE } from '@/lib/dev-dashboard/auth'
import { DELETE, POST } from '@/app/api/dev/dashboard-session/route'
import { GET as demoMemberGet } from '@/app/api/dev-dashboard/[...path]/route'
import { updateSession } from '@/utils/supabase/middleware'

function request(
  url: string,
  init: RequestInit = {},
  authenticated = false,
) {
  const headers = new Headers(init.headers)
  headers.set('host', new URL(url).host)
  if (authenticated) {
    headers.set('cookie', `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`)
  }
  return new NextRequest(url, {
    method: init.method,
    headers,
    body: init.body as BodyInit | null | undefined,
  })
}

describe('local dashboard demo routes', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sets a short-lived HTTP-only cookie for the exact localhost credentials', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const response = await POST(
      request('http://localhost:3000/api/dev/dashboard-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'demo@top100.local', password: 'Top100Demo!2026' }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ demo: true })
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=lax')
    expect(cookie).toContain('Path=/')
    expect(cookie).not.toContain('Secure')
  })

  it('handles a wrong password for the demo email and lets other emails fall through', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const wrong = await POST(
      request('http://localhost:3000/api/dev/dashboard-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'demo@top100.local', password: 'wrong' }),
      }),
    )
    expect(wrong.status).toBe(401)
    expect(await wrong.json()).toEqual({ demo: true, message: 'Invalid email or password.' })

    const normal = await POST(
      request('http://localhost:3000/api/dev/dashboard-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'member@example.com', password: 'anything' }),
      }),
    )
    expect(normal.status).toBe(200)
    expect(await normal.json()).toEqual({ demo: false })
  })

  it('is unavailable away from a loopback development server', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const remote = await POST(
      request('https://preview.top100.test/api/dev/dashboard-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'demo@top100.local', password: 'Top100Demo!2026' }),
      }),
    )
    expect(remote.status).toBe(404)

    vi.stubEnv('NODE_ENV', 'production')
    const production = await POST(
      request('http://localhost:3000/api/dev/dashboard-session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'demo@top100.local', password: 'Top100Demo!2026' }),
      }),
    )
    expect(production.status).toBe(404)
  })

  it('expires the local demo cookie on logout', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const response = await DELETE(request('http://localhost:3000/api/dev/dashboard-session', { method: 'DELETE' }))
    expect(response.status).toBe(200)
    const cookie = response.headers.get('set-cookie') ?? ''
    expect(cookie).toContain(`${DEV_DASHBOARD_COOKIE}=`)
    expect(cookie).toMatch(/Max-Age=0/i)
  })

  it('protects the catch-all demo API with the same session boundary', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const response = await demoMemberGet(
      request('http://localhost:3000/api/dev-dashboard/me'),
      { params: Promise.resolve({ path: ['me'] }) },
    )
    expect(response.status).toBe(401)
  })

  it('admits the demo dashboard and rewrites member APIs before contacting Supabase', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const dashboard = await updateSession(
      request('http://localhost:3000/dashboard', {}, true),
    )
    expect(dashboard.status).toBe(200)
    expect(dashboard.headers.get('x-middleware-next')).toBe('1')

    const memberApi = await updateSession(
      request('http://localhost:3000/api/member/me', {}, true),
    )
    expect(memberApi.status).toBe(200)
    expect(memberApi.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/api/dev-dashboard/me',
    )
  })
})
