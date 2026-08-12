import { describe, expect, it } from 'vitest'

import { attemptLocalDashboardLogin } from '@/lib/dev-dashboard/login'

type FakeFetch = typeof fetch

function response(status: number, body: unknown): Promise<Response> {
  return Promise.resolve(Response.json(body, { status }))
}

describe('local dashboard login decision', () => {
  it('handles a successful demo login and restricts redirects to the dashboard', async () => {
    const result = await attemptLocalDashboardLogin(
      (() => response(200, { demo: true })) as FakeFetch,
      { email: 'demo@top100.local', password: 'Top100Demo!2026' },
      '/admin',
    )
    expect(result).toEqual({ handled: true, redirectTo: '/dashboard' })

    const nested = await attemptLocalDashboardLogin(
      (() => response(200, { demo: true })) as FakeFetch,
      { email: 'demo@top100.local', password: 'Top100Demo!2026' },
      '/dashboard?section=posts',
    )
    expect(nested).toEqual({ handled: true, redirectTo: '/dashboard?section=posts' })

    const nestedRoute = await attemptLocalDashboardLogin(
      (() => response(200, { demo: true })) as FakeFetch,
      { email: 'demo@top100.local', password: 'Top100Demo!2026' },
      '/dashboard/messages/conversation-1',
    )
    expect(nestedRoute).toEqual({
      handled: true,
      redirectTo: '/dashboard/messages/conversation-1',
    })

    const protocolRelative = await attemptLocalDashboardLogin(
      (() => response(200, { demo: true })) as FakeFetch,
      { email: 'demo@top100.local', password: 'Top100Demo!2026' },
      '//evil.example/dashboard',
    )
    expect(protocolRelative).toEqual({ handled: true, redirectTo: '/dashboard' })
  })

  it.each([
    ['/dashboard/\\evil.example', 'a decoded backslash'],
    ['/dashboard/%5Cevil.example', 'an encoded backslash'],
    ['https://user:password@evil.example/dashboard', 'an absolute URL with credentials'],
    ['/dashboard/messages\r\nLocation: https://evil.example', 'CRLF control characters'],
    ['/dashboard/messages%0D%0ALocation:%20https://evil.example', 'encoded CRLF control characters'],
  ])('falls back safely when the requested path contains %s (%s)', async (requestedPath) => {
    const result = await attemptLocalDashboardLogin(
      (() => response(200, { demo: true })) as FakeFetch,
      { email: 'demo@top100.local', password: 'Top100Demo!2026' },
      requestedPath,
    )

    expect(result).toEqual({ handled: true, redirectTo: '/dashboard' })
  })

  it('keeps a nested dashboard path with its query string', async () => {
    const result = await attemptLocalDashboardLogin(
      (() => response(200, { demo: true })) as FakeFetch,
      { email: 'demo@top100.local', password: 'Top100Demo!2026' },
      '/dashboard/messages/conversation-1?view=compact&unread=1',
    )

    expect(result).toEqual({
      handled: true,
      redirectTo: '/dashboard/messages/conversation-1?view=compact&unread=1',
    })
  })

  it('handles an invalid password for the demo account', async () => {
    const result = await attemptLocalDashboardLogin(
      (() => response(401, { demo: true, message: 'Invalid email or password.' })) as FakeFetch,
      { email: 'demo@top100.local', password: 'wrong' },
      '',
    )
    expect(result).toEqual({ handled: true, error: 'Invalid email or password.' })
  })

  it('continues to Supabase for a normal account or unavailable demo endpoint', async () => {
    const normal = await attemptLocalDashboardLogin(
      (() => response(200, { demo: false })) as FakeFetch,
      { email: 'member@example.com', password: 'secret' },
      '/dashboard',
    )
    expect(normal).toEqual({ handled: false })

    const unavailable = await attemptLocalDashboardLogin(
      (() => response(404, { message: 'Not found.' })) as FakeFetch,
      { email: 'demo@top100.local', password: 'Top100Demo!2026' },
      '/dashboard',
    )
    expect(unavailable).toEqual({ handled: false })
  })

  it('does not block normal authentication when the local endpoint cannot be reached', async () => {
    const result = await attemptLocalDashboardLogin(
      (() => Promise.reject(new Error('offline'))) as FakeFetch,
      { email: 'member@example.com', password: 'secret' },
      '',
    )
    expect(result).toEqual({ handled: false })
  })
})
