import { describe, expect, it, vi } from 'vitest'

describe('password recovery client', () => {
  it('aborts a stalled request instead of leaving the form waiting indefinitely', async () => {
    vi.useFakeTimers()
    try {
      const { createRecoveryFetch } = await import('@/lib/supabase/password-recovery-client')
      let aborted = false
      const fetcher: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          aborted = true
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
      const pending = createRecoveryFetch(fetcher, 100)('https://example.supabase.co/auth/v1/recover')
      const outcome = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
      await vi.advanceTimersByTimeAsync(100)
      await outcome
      expect(aborted).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
  it('reuses the recovery client when the form is submitted again', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key')
    try {
      const { createPasswordRecoveryClient } = await import('@/lib/supabase/password-recovery-client')
      expect(createPasswordRecoveryClient()).toBe(createPasswordRecoveryClient())
    } finally {
      vi.unstubAllEnvs()
    }
  })
  it('requests a portable recovery link without a browser-bound PKCE verifier', async () => {
    const requests: Array<{ url: string; body: Record<string, unknown> }> = []
    const fakeFetch: typeof fetch = async (input, init) => {
      requests.push({
        url: String(input),
        body: JSON.parse(String(init?.body ?? '{}')),
      })
      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    const module = await import('@/lib/supabase/password-recovery-client').catch(() => null)
    expect(module?.createPasswordRecoveryClient).toBeTypeOf('function')

    const client = module!.createPasswordRecoveryClient({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'anon-key',
      fetch: fakeFetch,
    })
    const { error } = await client.auth.resetPasswordForEmail('admin@example.com', {
      redirectTo: 'https://www.top100afl.com/auth/reset-password?area=admin',
    })

    expect((client.auth as unknown as { storageKey: string }).storageKey).toBe('sb-example-password-recovery')
    expect(error).toBeNull()
    expect(requests).toHaveLength(1)
    expect(requests[0]).toEqual({
      url: 'https://example.supabase.co/auth/v1/recover?redirect_to=https%3A%2F%2Fwww.top100afl.com%2Fauth%2Freset-password%3Farea%3Dadmin',
      body: {
        code_challenge: null,
        code_challenge_method: null,
        email: 'admin@example.com',
        gotrue_meta_security: {},
      },
    })
  })
})
