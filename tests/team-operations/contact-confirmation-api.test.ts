import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), mail: vi.fn(), limit: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }))
vi.mock('@/lib/email/send', () => ({ sendTransactionalEmail: mocks.mail }))
vi.mock('@/lib/rate-limit', () => ({ rateLimitResponse: mocks.limit, getClientIdentifier: () => 'test-client' }))
import { GET, POST } from '@/app/api/member/contact-confirmation/[token]/route'
const token = '11111111-1111-4111-8111-111111111111'
const userId = '22222222-2222-4222-8222-222222222222'
const challengeId = '33333333-3333-4333-8333-333333333333'
const params = { params: Promise.resolve({ token }) }
const req = (body?: unknown, origin = 'https://www.top100afl.com') => new NextRequest(`https://www.top100afl.com/api/member/contact-confirmation/${token}`, {
  method: body ? 'POST' : 'GET', headers: { cookie: 'session=test', origin, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
})
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('CONTACT_CONFIRMATION_SECRET', 'a-long-test-only-contact-confirmation-key')
  mocks.session.mockResolvedValue({ user: { id: userId, email: 'signed-in@example.test' } })
  mocks.limit.mockResolvedValue(null); mocks.mail.mockResolvedValue({ ok: true })
  mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
    if (name === 'team_contact_confirmation_context') return { data: { ok: true, id: token, status: 'initiated', rep_name: 'Test Rep', channel: 'whatsapp', initiated_at: '2026-11-03T08:00:00Z', email: 'awardee@example.test' }, error: null }
    if (name === 'team_prepare_contact_challenge') return { data: { ok: true, challenge_id: args.p_challenge_id, expires_at: '2026-11-03T08:10:00Z', email: 'awardee@example.test' }, error: null }
    return { data: { ok: true, status: 'confirmed' }, error: null }
  })
})
afterEach(() => { vi.unstubAllEnvs() })
it('requires a verified server session before reading proof or sending a code', async () => {
  mocks.session.mockResolvedValue(null)
  expect((await GET(req(), params)).status).toBe(401)
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(401)
  expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.mail).not.toHaveBeenCalled()
})
it('blocks cross-site requests before any contact mutation', async () => {
  expect((await POST(req({ action: 'request_code' }, 'https://attacker.test'), params)).status).toBe(403)
  expect(mocks.rpc).not.toHaveBeenCalled()
})
it('does not accept a forged recipient, approval, proof timestamp or digest', async () => {
  for (const extra of [{ userId: 'rep-id' }, { approved: true }, { confirmedAt: '2020-01-01' }, { codeHash: 'forged' }, { email: 'rep@example.test' }]) {
    expect((await POST(req({ action: 'request_code', ...extra }), params)).status).toBe(400)
  }
  expect(mocks.mail).not.toHaveBeenCalled()
})
it('GET provides safe context without sending email or revealing a digest', async () => {
  const response = await GET(req(), params); const result = await response.json()
  expect(response.status).toBe(200); expect(result.repName).toBe('Test Rep')
  expect(result.emailHint).not.toBe('awardee@example.test')
  expect(mocks.mail).not.toHaveBeenCalled()
  expect(mocks.rpc).toHaveBeenCalledWith('team_contact_confirmation_context', { p_token: token, p_user_id: userId })
})
it('sends the code only to the database-owned recipient and returns no code or digest', async () => {
  const response = await POST(req({ action: 'request_code' }), params); const result = await response.json()
  expect(response.status).toBe(200)
  expect(mocks.mail).toHaveBeenCalledWith(expect.objectContaining({ to: 'awardee@example.test', requireBrevoSmtp: true }))
  const prepared = mocks.rpc.mock.calls.find(call => call[0] === 'team_prepare_contact_challenge')![1]
  expect(prepared.p_user_id).toBe(userId); expect(prepared.p_code_hash).toMatch(/^[0-9a-f]{64}$/)
  expect(result.challengeId).toBe(prepared.p_challenge_id)
  expect(result).not.toHaveProperty('code'); expect(result).not.toHaveProperty('codeHash')
  expect(result).not.toHaveProperty('email')
  const activationIndex = mocks.rpc.mock.calls.findIndex(call => call[0] === 'team_activate_contact_challenge')
  expect(activationIndex).toBeGreaterThan(-1)
  expect(mocks.rpc.mock.invocationCallOrder[activationIndex]).toBeGreaterThan(mocks.mail.mock.invocationCallOrder[0])
})
it('invalidates the challenge when SMTP fails or its outcome is uncertain', async () => {
  mocks.mail.mockResolvedValue({ ok: false, delivery: 'unknown' })
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(503)
  const prepared = mocks.rpc.mock.calls.find(call => call[0] === 'team_prepare_contact_challenge')![1]
  expect(mocks.rpc).toHaveBeenCalledWith('team_invalidate_contact_challenge', { p_token: token, p_user_id: userId, p_challenge_id: prepared.p_challenge_id })
  expect(mocks.rpc.mock.calls.some(call => call[0] === 'team_activate_contact_challenge')).toBe(false)
})
it('does not activate proof when mail throws and cleanup also fails', async () => {
  mocks.mail.mockRejectedValue(new Error('unknown SMTP outcome'))
  const original = mocks.rpc.getMockImplementation()!
  mocks.rpc.mockImplementation(async (...args) => args[0] === 'team_invalidate_contact_challenge' ? { data: null, error: { code: 'network' } } : original(...args))
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(503)
  expect(mocks.rpc.mock.calls.some(call => call[0] === 'team_activate_contact_challenge')).toBe(false)
})
it('only activates a challenge after successful sending and fails closed if activation fails', async () => {
  const original = mocks.rpc.getMockImplementation()!
  mocks.rpc.mockImplementation(async (...args) => args[0] === 'team_activate_contact_challenge' ? { data: null, error: { code: 'network' } } : original(...args))
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(503)
  expect(mocks.mail).toHaveBeenCalledOnce()
  expect(mocks.rpc.mock.calls.some(call => call[0] === 'team_invalidate_contact_challenge')).toBe(true)
})
it('preserves the payment-won race result after cleaning up the challenge', async () => {
  const original = mocks.rpc.getMockImplementation()!
  mocks.rpc.mockImplementation(async (...args) => args[0] === 'team_activate_contact_challenge' ? { data: { ok: false, reason: 'contact_attempt_unavailable' }, error: null } : original(...args))
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(409)
  expect(mocks.rpc.mock.calls.some(call => call[0] === 'team_invalidate_contact_challenge')).toBe(true)
})
it('returns a clear unavailable response only after the recipient identity is established', async () => {
  mocks.rpc.mockResolvedValue({ data: { ok: false, reason: 'contact_attempt_unavailable' }, error: null })
  expect((await GET(req(), params)).status).toBe(409)
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(409)
  expect(mocks.mail).not.toHaveBeenCalled()
  mocks.rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
  expect((await GET(req(), params)).status).toBe(404)
})
it('fails closed when recipient identity does not match or verification is rate limited', async () => {
  mocks.rpc.mockResolvedValue({ data: { ok: false, reason: 'not_found' }, error: null })
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(404)
  expect(mocks.mail).not.toHaveBeenCalled()
  mocks.limit.mockResolvedValue(Response.json({}, { status: 429 }))
  expect((await POST(req({ action: 'request_code' }), params)).status).toBe(429)
})
it('requires a code for confirmation even if account email was auto-confirmed', async () => {
  mocks.session.mockResolvedValue({ user: { id: userId, rawPayload: { email_confirmed_at: '2020-01-01' } } })
  expect((await POST(req({ action: 'confirm', challengeId }), params)).status).toBe(400)
  expect(mocks.mail).not.toHaveBeenCalled()
})
it('passes only server-derived identity and code proof to the confirmation transaction', async () => {
  const response = await POST(req({ action: 'confirm', challengeId, code: '123456' }), params)
  expect(response.status).toBe(200)
  expect(mocks.rpc).toHaveBeenCalledWith('team_confirm_contact_attempt', expect.objectContaining({ p_token: token, p_user_id: userId, p_challenge_id: challengeId, p_confirmed: true, p_code_hash: expect.stringMatching(/^[0-9a-f]{64}$/) }))
  expect(mocks.mail).not.toHaveBeenCalled()
})
