import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createMagazineRecoveryToken, createMagazineOtpChallenge, readMagazineOtpChallenge, magazineOtpMatches, createMagazineOtpCode, MAGAZINE_OTP_COOKIE } from '@/lib/magazine/guest-recovery'

const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), send: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: () => mocks }) }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: mocks.send }))
vi.mock('@/lib/magazine/payment-server', () => ({ getActiveMagazineCampaign: async () => ({ id: 'campaign' }) }))
vi.mock('@/lib/rate-limit', () => ({ RATE_LIMITS: { AUTH: {} }, getClientIdentifier: () => 'test', checkRateLimit: mocks.rate, createRateLimitResponse: () => new Response('', { status: 429 }) }))
import { POST } from '@/app/api/public/magazine/recover/route'

const id = '11111111-1111-4111-8111-111111111111'
const hash = 'a'.repeat(64)
const now = 1_700_000_000_000
function request(body: unknown, otpCookie?: string) {
  return new NextRequest('https://top100afl.com/api/public/magazine/recover', { method: 'POST', headers: { 'content-type': 'application/json', ...(otpCookie ? { cookie: `${MAGAZINE_OTP_COOKIE}=${otpCookie}`, origin: 'https://top100afl.com' } : {}) }, body: JSON.stringify(body) })
}
beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-secret')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://top100afl.com')
  for (const method of [mocks.update, mocks.eq, mocks.is, mocks.select]) method.mockReturnValue(mocks)
  mocks.send.mockResolvedValue({ ok: true })
  mocks.rate.mockResolvedValue({ success: true })
})
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })

describe('same-page magazine OTP recovery', () => {
  it('encrypts codes and rejects expired or tampered ciphertext', () => {
    const token = createMagazineRecoveryToken(id, hash, now)
    const challenge = createMagazineOtpChallenge('guest@example.com', '012345', token, now)
    const decoded = readMagazineOtpChallenge(challenge, now)!
    expect(magazineOtpMatches(decoded, '012345')).toBe(true)
    expect(magazineOtpMatches(decoded, '012346')).toBe(false)
    expect(Buffer.from(challenge, 'base64url').toString('utf8')).not.toContain('012345')
    expect(readMagazineOtpChallenge(challenge, now + 600_000)).toBeNull()
    expect(readMagazineOtpChallenge(challenge.slice(0, 40) + (challenge[40] === 'A' ? 'B' : 'A') + challenge.slice(41), now)).toBeNull()
    expect(createMagazineOtpCode()).toMatch(/^[0-9]{6}$/)
  })

  it('verifies the code, rotates access conditionally, and clears the challenge', async () => {
    const challenge = createMagazineOtpChallenge('guest@example.com', '012345', createMagazineRecoveryToken(id, hash))
    mocks.select.mockResolvedValueOnce({ data: [{ id }], error: null })
    const response = await POST(request({ code: '012345' }, challenge))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ resumed: true })
    expect(response.cookies.get('afl_magazine_guest_access')?.value).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(response.cookies.get(MAGAZINE_OTP_COOKIE)?.value).toBe('')
    expect(mocks.eq).toHaveBeenCalledWith('guest_access_token_hash', hash)
    expect(mocks.rate).toHaveBeenCalledWith({ maxRequests: 5, windowSeconds: 600, identifier: 'magazine-otp-verify:guest@example.com' })
  })

  it('rejects wrong codes, missing challenges, and nonexistent applications without updating access', async () => {
    const challenge = createMagazineOtpChallenge('guest@example.com', '012345', createMagazineRecoveryToken(id, hash))
    expect((await POST(request({ code: '012346' }, challenge))).status).toBe(400)
    expect((await POST(request({ code: '012345' }))).status).toBe(400)
    const unknown = createMagazineOtpChallenge('unknown@example.com', '012345', null)
    expect((await POST(request({ code: '012345' }, unknown))).status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('blocks verification beyond its shared email limit and blocks early resends', async () => {
    const challenge = createMagazineOtpChallenge('guest@example.com', '012345', createMagazineRecoveryToken(id, hash))
    mocks.rate.mockImplementation(async ({ identifier }) => ({ success: !identifier.startsWith('magazine-otp-') }))
    expect((await POST(request({ code: '012345' }, challenge))).status).toBe(429)
    expect(mocks.update).not.toHaveBeenCalled()
    expect((await POST(request({ email: 'guest@example.com' }))).status).toBe(429)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it('emails a code with a link fallback, but returns neither secret in JSON', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id, guest_access_token_hash: hash }, error: null })
    const response = await POST(request({ email: 'guest@example.com' }))
    const body = await response.json()
    expect(body).toMatchObject({ codeSent: true, resendAfter: 60 })
    expect(body).not.toHaveProperty('code')
    const challenge = readMagazineOtpChallenge(response.cookies.get(MAGAZINE_OTP_COOKIE)?.value)!
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining(challenge.code) }))
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining('#resume=') }))
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })

  it('rejects replay of a correct code after access has already rotated', async () => {
    const challenge = createMagazineOtpChallenge('guest@example.com', '012345', createMagazineRecoveryToken(id, hash))
    mocks.select.mockResolvedValueOnce({ data: [], error: null })
    const response = await POST(request({ code: '012345' }, challenge))
    expect(response.status).toBe(400)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
