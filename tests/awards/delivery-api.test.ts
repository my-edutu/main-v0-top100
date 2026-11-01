import { beforeEach, describe, expect, it, vi } from 'vitest'
const state = vi.hoisted(() => ({ user: vi.fn(), rate: vi.fn(), start: vi.fn(), read: vi.fn(), reconcile: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: state.user }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: state.rate, RATE_LIMITS: { AUTH: {}, QUERY: {} }, createRateLimitResponse: () => new Response('{}', { status: 429 }) }))
vi.mock('@/lib/awards/delivery/server', () => ({ DeliveryError: class extends Error {}, startDeliveryCheckout: state.start, readDelivery: state.read, saveDeliveryQuote: state.save, reconcileMemberDelivery: state.reconcile }))
import { POST as checkout } from '@/app/api/member/award/delivery/checkout/route'
import { POST as reconcile } from '@/app/api/member/award/delivery/reconcile/route'
import { GET as read } from '@/app/api/member/award/delivery/route'
const deliveryId = '3b1ab34c-af79-42de-857c-b56e2aa1aa01'
const request = (body: unknown) => new Request('https://top100afl.com/api/member/award/delivery/checkout', { method: 'POST', body: JSON.stringify(body) })
beforeEach(() => { vi.resetAllMocks(); state.user.mockResolvedValue({ id: 'trusted-member', email: 'trusted@example.com' }); state.rate.mockResolvedValue({ success: true }); state.reconcile.mockResolvedValue({ delivery: null }); state.start.mockResolvedValue({ status: 'open', checkoutUrl: 'https://checkout.bachs.io/x' }) })
describe('member delivery API boundaries', () => {
  it('requires authentication before reading or opening a payment', async () => {
    state.user.mockResolvedValue(null)
    expect((await checkout(request({ deliveryId }))).status).toBe(401)
    expect((await read(new Request('https://top100afl.com/api/member/award/delivery'))).status).toBe(401)
    expect(state.start).not.toHaveBeenCalled(); expect(state.read).not.toHaveBeenCalled()
  })
  it('uses the authenticated member and only the delivery ID', async () => {
    const response = await checkout(request({ deliveryId }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(state.start).toHaveBeenCalledWith('trusted-member', deliveryId)
  })
  it.each([{ deliveryId, memberId: 'another-member' }, { deliveryId, amountMinor: 1 }, { deliveryId, status: 'paid' }])('rejects client payment/ownership fields', async body => {
    expect((await checkout(request(body))).status).toBe(400)
    expect(state.start).not.toHaveBeenCalled()
  })
  it('never accepts browser payment proof through reconciliation', async () => {
    expect((await reconcile(request({ status: 'paid', checkoutId: 'client-value' }))).status).toBe(400)
    expect(state.reconcile).not.toHaveBeenCalled()
    expect((await reconcile(request({}))).status).toBe(200)
    expect(state.reconcile).toHaveBeenCalledWith('trusted-member')
  })
  it('limits checkout attempts before invoking the provider', async () => {
    state.rate.mockResolvedValue({ success: false })
    expect((await checkout(request({ deliveryId }))).status).toBe(429)
    expect(state.start).not.toHaveBeenCalled()
  })
})
