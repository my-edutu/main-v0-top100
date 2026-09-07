import { describe, expect, it, vi } from 'vitest'

import { buildSignupPayload, verifySignupCaptcha } from '@/lib/auth/signup-turnstile'

describe('signup request payload', () => {
  it('includes the fresh Turnstile token with the account claim', () => {
    expect(buildSignupPayload({
      awardeeId: 'awardee-1',
      email: ' awardee@example.com ',
      password: 'safe-password',
      inviteCode: ' AFL-READY ',
      captchaToken: 'fresh-token',
    })).toEqual({
      awardeeId: 'awardee-1',
      email: 'awardee@example.com',
      password: 'safe-password',
      inviteCode: 'AFL-READY',
      captchaToken: 'fresh-token',
    })
  })
})

describe('signup Turnstile verification', () => {
  it('rejects a missing token before contacting Cloudflare', async () => {
    const request = vi.fn()
    await expect(verifySignupCaptcha(undefined, { secret: 'secret', hostnames: 'top100afl.com', request })).resolves.toBe(false)
    expect(request).not.toHaveBeenCalled()
  })

  it('accepts only a successful signup token from an approved hostname', async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      action: 'signup',
      hostname: 'top100afl.com',
    }), { status: 200 }))

    await expect(verifySignupCaptcha('fresh-token', {
      secret: 'secret',
      hostnames: 'top100afl.com,www.top100afl.com',
      request,
    })).resolves.toBe(true)
  })

  it('rejects a valid token issued for another action or hostname', async () => {
    const wrongAction = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, action: 'login', hostname: 'top100afl.com' })))
    const wrongHostname = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, action: 'signup', hostname: 'attacker.example' })))

    await expect(verifySignupCaptcha('token', { secret: 'secret', hostnames: 'top100afl.com', request: wrongAction })).resolves.toBe(false)
    await expect(verifySignupCaptcha('token', { secret: 'secret', hostnames: 'top100afl.com', request: wrongHostname })).resolves.toBe(false)
  })
})
