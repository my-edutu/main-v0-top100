import { describe, expect, it } from 'vitest'

import { friendlySignInError } from '@/lib/auth-utils'

describe('friendlySignInError', () => {
  it('uses the stable Auth error code for invalid credentials', () => {
    expect(
      friendlySignInError({
        code: 'invalid_credentials',
        message: 'A translated or changed upstream message',
        status: 400,
      }),
    ).toBe('Invalid email or password.')
  })

  it('classifies retryable 500 responses as service failures', () => {
    expect(
      friendlySignInError({
        code: 'unexpected_failure',
        name: 'AuthRetryableFetchError',
        message: '{}',
        status: 500,
      }),
    ).toBe(
      'Sign-in is temporarily unavailable. Please try again in a few minutes — if it keeps happening, contact the Top100 team.',
    )
  })
})
