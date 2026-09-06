import { NextRequest } from 'next/server'
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
  ).toBe(403)
})
