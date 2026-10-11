import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createMagazineRecoveryToken, readMagazineRecoveryToken } from '@/lib/magazine/guest-recovery'

const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), is: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(), send: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: () => mocks }) }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: mocks.send }))
vi.mock('@/lib/magazine/payment-server', () => ({ getActiveMagazineCampaign: async () => ({ id: 'campaign' }) }))
vi.mock('@/lib/rate-limit', () => ({ RATE_LIMITS: { AUTH: {} }, getClientIdentifier: () => 'test', checkRateLimit: async () => ({ success: true }), createRateLimitResponse: () => new Response('', { status: 429 }) }))
import { POST } from '@/app/api/public/magazine/recover/route'

const id = '11111111-1111-4111-8111-111111111111'
const hash = 'a'.repeat(64)
const now = 1_700_000_000_000
function request(body: unknown) { return new NextRequest('https://top100afl.com/api/public/magazine/recover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) }

beforeEach(() => {
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-secret')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://top100afl.com')
  for (const method of [mocks.update, mocks.eq, mocks.is, mocks.select]) method.mockReturnValue(mocks)
  mocks.send.mockResolvedValue({ ok: true })
})
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })

describe('private guest application recovery', () => {
  it('accepts signed claims and rejects tampering, extra segments and expired links', () => {
    const token = createMagazineRecoveryToken(id, hash, now)
    expect(readMagazineRecoveryToken(token, now)).toMatchObject({ orderId: id, accessHash: hash })
    expect(readMagazineRecoveryToken(token + '.extra', now)).toBeNull()
    const [payload, signature] = token.split('.')
    expect(readMagazineRecoveryToken(`${payload}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`, now)).toBeNull()
    expect(readMagazineRecoveryToken(token, now + 30 * 60 * 1000)).toBeNull()
  })

  it('issues the same neutral response for unknown email and emails a fragment link for an existing application', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const unknown = await POST(request({ email: 'guest@example.com' }))
    expect(mocks.send).not.toHaveBeenCalled()
    mocks.maybeSingle.mockResolvedValueOnce({ data: { id, guest_access_token_hash: hash }, error: null })
    const existing = await POST(request({ email: 'guest@example.com' }))
    expect(await existing.json()).toEqual(await unknown.json())
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'guest@example.com', text: expect.stringContaining('https://top100afl.com/magazine/feature#resume=') }))
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rotates only guest access with a conditional update, and puts the new credential in an HttpOnly cookie', async () => {
    mocks.select.mockResolvedValueOnce({ data: [{ id }], error: null })
    const response = await POST(request({ token: createMagazineRecoveryToken(id, hash) }))
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ guest_access_token_hash: expect.stringMatching(/^[a-f0-9]{64}$/) })
    expect(mocks.eq).toHaveBeenCalledWith('id', id)
    expect(mocks.eq).toHaveBeenCalledWith('guest_access_token_hash', hash)
    expect(mocks.is).toHaveBeenCalledWith('profile_id', null)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(await response.json()).toEqual({ resumed: true })
  })

  it('rejects an invalid or already consumed link without issuing a cookie', async () => {
    expect((await POST(request({ token: 'invalid' }))).status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
    mocks.select.mockResolvedValueOnce({ data: [], error: null })
    const response = await POST(request({ token: createMagazineRecoveryToken(id, hash) }))
    expect(response.status).toBe(400)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})
