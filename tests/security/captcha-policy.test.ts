import { describe, expect, it } from 'vitest'

import { getCaptchaState } from '@/lib/auth/captcha-policy'

describe('captcha policy', () => {
  it('requires a token when a Turnstile site key is configured', () => {
    expect(getCaptchaState('site-key', '')).toBe('missing')
    expect(getCaptchaState('site-key', 'token')).toBe('ready')
  })

  it('disables the client challenge when no site key is configured', () => {
    expect(getCaptchaState('', '')).toBe('disabled')
  })
})
