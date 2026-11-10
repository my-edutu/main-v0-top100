import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  awardee: vi.fn(),
  captcha: vi.fn(),
  rateLimit: vi.fn(),
  generateCode: vi.fn(),
  revokeCode: vi.fn(),
  send: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.awardee }) }) }),
  }),
}))
vi.mock('@/lib/auth/signup-turnstile', () => ({ verifySignupCaptcha: mocks.captcha }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitResponse: mocks.rateLimit, getClientIdentifier: () => 'test' }))
vi.mock('@/lib/access-codes', () => ({ generateCode: mocks.generateCode, revokeCode: mocks.revokeCode }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: mocks.send }))

import { POST } from '@/app/api/auth/claim-request/route'

function request(email = 'ADA@example.com') {
  return new NextRequest('https://top100afl.com/api/auth/claim-request', {
    method: 'POST',
    body: JSON.stringify({
      action: 'send-code',
      awardeeId: '00000000-0000-4000-8000-000000000001',
      email,
      captchaToken: 'signup-captcha',
    }),
  })
}

describe('emailed signup codes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.awardee.mockResolvedValue({ data: { email: 'ada@example.com', profile_id: null } })
    mocks.captcha.mockResolvedValue(true)
    mocks.rateLimit.mockResolvedValue(null)
    mocks.generateCode.mockResolvedValue({ id: 'code-id', code: 'AFL-K3M9Q-7VZ2R' })
    mocks.send.mockResolvedValue({ ok: true })
  })

  it('sends an email-bound single-use code through SMTP without returning the code', async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sent: true })
    expect(mocks.generateCode).toHaveBeenCalledWith(expect.objectContaining({
      email: 'ada@example.com', mode: 'single_use', durationHours: 1,
    }))
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ada@example.com', requireBrevoSmtp: true, text: expect.stringContaining('AFL-K3M9Q-7VZ2R'),
    }))
  })

  it('does not issue a code for an email that differs from the awardee record', async () => {
    expect((await POST(request('other@example.com'))).status).toBe(403)
    expect(mocks.generateCode).not.toHaveBeenCalled()
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('does not issue a code when delivery is rate limited', async () => {
    mocks.rateLimit.mockResolvedValueOnce(new Response(null, { status: 429 }))
    expect((await POST(request())).status).toBe(429)
    expect(mocks.generateCode).not.toHaveBeenCalled()
  })

  it('revokes a code after a definitive SMTP failure', async () => {
    mocks.send.mockResolvedValue({ ok: false, delivery: 'not_sent' })
    expect((await POST(request())).status).toBe(503)
    expect(mocks.revokeCode).toHaveBeenCalledWith('code-id')
  })

  it('keeps the code usable if SMTP may have accepted the email', async () => {
    mocks.send.mockResolvedValue({ ok: false, delivery: 'unknown' })
    expect((await POST(request())).status).toBe(503)
    expect(mocks.revokeCode).not.toHaveBeenCalled()
  })
})
