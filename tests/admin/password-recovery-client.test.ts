import { describe, expect, it } from 'vitest'

describe('password recovery client', () => {
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
