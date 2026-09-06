import { beforeEach, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/member/onboarding/route'
const state = vi.hoisted(() => ({
  user: 'member-one' as string | null,
  update: {} as Record<string, unknown>,
  ids: [] as string[],
  prefs: {} as Record<string, unknown>,
}))
const fields = {
  headline: 'Youth mentor',
  location: 'Abuja, Nigeria',
  field: 'Education',
  bio: 'I mentor young people and build accessible learning programmes in my community.',
}
vi.mock('@/lib/auth-server', () => ({
  getCurrentUser: async () => (state.user ? { id: state.user } : null),
}))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => {
      let updating = false
      const chain = {
        select: () => chain,
        eq: (_key: string, id: string) => {
          state.ids.push(id)
          return chain
        },
        update: (value: Record<string, unknown>) => {
          updating = true
          state.update = value
          return chain
        },
        single: async () => ({
          data: {
            id: 'member-one',
            ...fields,
            notification_prefs: state.prefs,
            bio_update_count: 2,
            ...(updating ? state.update : {}),
          },
          error: null,
        }),
      }
      return chain
    },
  }),
}))
beforeEach(() => {
  state.user = 'member-one'
  state.update = {}
  state.ids = []
  state.prefs = {}
})
function request(body: unknown) {
  return new Request('https://www.top100afl.com/api/member/onboarding', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
it('requires authentication', async () => {
  state.user = null
  expect((await POST(request(fields))).status).toBe(401)
})
it('saves drafts without completing onboarding or consuming BIO edits', async () => {
  expect((await POST(request({ headline: 'Mentor', step: 1 }))).status).toBe(
    200,
  )
  expect(state.update).not.toHaveProperty('bio_update_count')
  expect(state.update.notification_prefs).not.toHaveProperty(
    'onboardingCompletedAt',
  )
})
it('validates completion and scopes writes to the authenticated member', async () => {
  expect(
    (await POST(request({ ...fields, complete: true, id: 'other-member' })))
      .status,
  ).toBe(200)
  expect(state.ids.every((id) => id === 'member-one')).toBe(true)
  expect(state.update.notification_prefs).toHaveProperty(
    'onboardingCompletedAt',
  )
})
it('rejects incomplete submissions', async () => {
  expect(
    (await POST(request({ ...fields, headline: ' ', complete: true }))).status,
  ).toBe(400)
  expect(state.update).toEqual({})
})
it('allows the story to be skipped at completion', async () => {
  expect((await POST(request({ ...fields, bio: '', complete: true }))).status).toBe(200)
  expect(state.update.bio).toBe('')
  expect(state.update.notification_prefs).toHaveProperty('onboardingCompletedAt')
})
it('cannot be reused to evade the BIO limit after completion', async () => {
  state.prefs = { onboardingCompletedAt: '2026-09-06T00:00:00Z' }
  expect((await POST(request({ ...fields, complete: true }))).status).toBe(409)
  expect(state.update).toEqual({})
})
