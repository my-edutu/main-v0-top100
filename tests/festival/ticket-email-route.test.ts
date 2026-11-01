import { beforeEach, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ user: vi.fn(), read: vi.fn(), send: vi.fn(), allowed: true, rate: true }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: state.user }))
vi.mock('@/lib/festival/access', () => ({ checkFestivalAwardeeAccess: async () => state.allowed ? null : new Response('{}', { status: 403 }) }))
vi.mock('@/lib/festival/server', () => ({ readFestivalInterest: state.read }))
vi.mock('@/lib/festival/ticket-email', () => ({ sendFestivalTicketEmail: state.send }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success: state.rate }), createRateLimitResponse: () => new Response('{}', { status: 429 }), RATE_LIMITS: { AUTH: {} } }))
import { POST } from '@/app/api/member/festival-interest/ticket-email/route'
beforeEach(() => {
  vi.resetAllMocks(); state.allowed = true; state.rate = true
  state.user.mockResolvedValue({ id: 'member-1', email: 'member@example.com' })
  state.read.mockResolvedValue({ payment: 'confirmed', ticket: { id: 'ticket-1', emailStatus: 'failed' }, interest: { fullName: 'Amara' } })
  state.send.mockResolvedValue('sent')
})
it('requires authentication before reading registration', async () => {
  state.user.mockResolvedValue(null)
  expect((await POST()).status).toBe(401)
  expect(state.read).not.toHaveBeenCalled()
})
it('rejects a suspended awardee before accessing their ticket', async () => {
  state.allowed = false
  expect((await POST()).status).toBe(403)
  expect(state.read).not.toHaveBeenCalled()
})
it('rate limits retries before sending', async () => {
  state.rate = false
  expect((await POST()).status).toBe(429)
  expect(state.send).not.toHaveBeenCalled()
})
it.each([['required', 409], ['pending', 409], ['unavailable', 503]] as const)('blocks %s payment even for an existing ticket', async (payment, status) => {
  state.read.mockResolvedValue({ payment, ticket: { id: 'old-ticket' } })
  expect((await POST()).status).toBe(status)
  expect(state.send).not.toHaveBeenCalled()
})
it('sends to the signed-in account and returns the recorded status without caching', async () => {
  const response = await POST()
  expect(response.status).toBe(200)
  expect(state.send).toHaveBeenCalledWith('member-1', 'member@example.com')
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  expect(await response.json()).toMatchObject({ ticket: { emailStatus: 'sent' } })
})
it('does not send without a registered ticket', async () => {
  state.read.mockResolvedValue({ payment: 'confirmed', ticket: null })
  expect((await POST()).status).toBe(409)
  expect(state.send).not.toHaveBeenCalled()
})
