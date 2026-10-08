import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, expect, it, vi } from 'vitest'
import { updateSession } from '@/utils/supabase/middleware'
const state = vi.hoisted(() => ({
  prefs: {} as Record<string, unknown>,
  error: null as unknown,
}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: { claims: { sub: 'member-1' } } }),
      getSession: async () => ({ data: { session: null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { notification_prefs: state.prefs },
            error: state.error,
          }),
        }),
      }),
    }),
  }),
}))
beforeEach(() => {
  state.prefs = {}
  state.error = null
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key')
  vi.stubGlobal('fetch', vi.fn(async () => state.error ? new Response(null, { status: 503 }) : Response.json([{ notification_prefs: state.prefs }])))
})
it('redirects incomplete members from deep dashboard links', async () => {
  const response = await updateSession(
    new NextRequest('https://www.top100afl.com/dashboard/messages/example'),
  )
  expect(response.headers.get('location')).toBe(
    'https://www.top100afl.com/dashboard/onboarding',
  )
})
it('blocks member features while preserving setup endpoints', async () => {
  expect(
    (
      await updateSession(
        new NextRequest('https://www.top100afl.com/api/member/conversations'),
      )
    ).status,
  ).toBe(403)
  expect(
    (
      await updateSession(
        new NextRequest('https://www.top100afl.com/api/member/me'),
      )
    ).status,
  ).toBe(200)
  expect(
    (
      await updateSession(
        new NextRequest('https://www.top100afl.com/dashboard/onboarding'),
      )
    ).status,
  ).toBe(200)
})
it('does not force incomplete members back into the middleware onboarding redirect', () => {
  const page = readFileSync(join(process.cwd(), 'app/dashboard/onboarding/page.tsx'), 'utf8')
  expect(page).not.toContain('window.location.replace')
  expect(page).toContain('Continue to dashboard')
})
it('allows completed members and fails closed on a database error', async () => {
  state.prefs = { onboardingCompletedAt: '2026-09-06T00:00:00Z' }
  expect(
    (
      await updateSession(
        new NextRequest('https://www.top100afl.com/dashboard'),
      )
    ).status,
  ).toBe(200)
  state.error = { message: 'Unavailable' }
  expect(
    (
      await updateSession(
        new NextRequest('https://www.top100afl.com/api/member/conversations'),
      )
    ).status,
  ).toBe(503)
})

it('uses the authenticated user scope for the authoritative completion check', async () => {
  state.prefs = { onboardingCompletedAt: '2026-10-06T22:30:47.031Z' }
  const response = await updateSession(new NextRequest('https://www.top100afl.com/dashboard'))
  expect(response.status).toBe(200)
  expect(fetch).toHaveBeenCalledWith('https://example.supabase.co/rest/v1/profiles?id=eq.member-1&select=notification_prefs', expect.objectContaining({ cache: 'no-store' }))
})
