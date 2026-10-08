import { beforeEach, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/member/onboarding/route'
const state = vi.hoisted(() => ({
  user: 'member-one' as string | null,
  update: {} as Record<string, unknown>,
  ids: [] as string[],
  prefs: {} as Record<string, unknown>,
  missingPrefsRpc: false,
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
    rpc: async (_name: string, args: { p_patch: Record<string, unknown> }) => {
      if (state.missingPrefsRpc)
        return { data: null, error: { code: 'PGRST202' } }
      state.prefs = { ...state.prefs, ...args.p_patch }
      return { data: state.prefs, error: null }
    },
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
          if ('notification_prefs' in value)
            state.prefs = value.notification_prefs as Record<string, unknown>
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
  state.missingPrefsRpc = false
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
  expect(state.prefs).not.toHaveProperty(
    'onboardingCompletedAt',
  )
})
it('saves onboarding progress when the database has not installed the prefs RPC migration', async () => {
  state.missingPrefsRpc = true
  state.prefs = { existingPreference: true }
  const response = await POST(request({ headline: 'Mentor', step: 2 }))
  expect(response.status).toBe(200)
  expect(state.prefs).toMatchObject({
    existingPreference: true,
    onboardingStep: 2,
  })
})
it('validates completion and scopes writes to the authenticated member', async () => {
  expect(
    (await POST(request({ ...fields, complete: true, id: 'other-member' })))
      .status,
  ).toBe(200)
  expect(state.ids.every((id) => id === 'member-one')).toBe(true)
  expect(state.prefs).toHaveProperty(
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
  expect(state.prefs).toHaveProperty('onboardingCompletedAt')
})
it('allows a short optional Bio when completing setup', async () => {
  const response = await POST(request({ ...fields, bio: 'A short intro.', complete: true }))

  expect(response.status).toBe(200)
  expect(state.update.bio).toBe('A short intro.')
  expect(state.prefs).toHaveProperty('onboardingCompletedAt')
})
it('treats a repeated completion as successful without changing a completed profile', async () => {
  state.prefs = { onboardingCompletedAt: '2026-09-06T00:00:00Z' }
  const response = await POST(request({ ...fields, complete: true }))
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    member: { onboardingCompletedAt: '2026-09-06T00:00:00Z' },
  })
  expect(state.update).toEqual({})
})

it('blocks a cross-site browser request that carries session cookies', async () => {
  const req = new Request('https://www.top100afl.com/api/member/onboarding', {
    method: 'POST',
    headers: { cookie: 'sb-session=test', origin: 'https://attacker.example', 'sec-fetch-site': 'cross-site' },
    body: JSON.stringify(fields),
  })
  expect((await POST(req)).status).toBe(403)
  expect(state.ids).toEqual([])
})
