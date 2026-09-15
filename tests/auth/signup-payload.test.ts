import { describe, expect, it } from 'vitest'

import { buildSignupPayload } from '@/lib/auth/signup-payload'

describe('signup payload', () => {
  it('includes the Turnstile token for the server-side verification', () => {
    expect(
      buildSignupPayload({
        awardeeId: 'awardee-id',
        email: 'awardee@example.com',
        password: 'password123',
        inviteCode: 'AFL-TEST',
        captchaToken: 'turnstile-token',
      }),
    ).toEqual({
      awardeeId: 'awardee-id',
      email: 'awardee@example.com',
      password: 'password123',
      inviteCode: 'AFL-TEST',
      captchaToken: 'turnstile-token',
    })
  })
})
