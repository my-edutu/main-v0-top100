import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(), enabled: vi.fn(), rate: vi.fn(), checkout: vi.fn(), view: vi.fn(),
}))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/production-readiness', () => ({ isAwardCheckoutEnabled: mocks.enabled }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, RATE_LIMITS: { AUTH: {} }, createRateLimitResponse: () => new Response('{}', {status:429}) }))
vi.mock('@/lib/awards/payment-server', () => ({ createAwardPaymentCheckout: mocks.checkout, getAwardPaymentView: mocks.view }))
import { POST } from '@/app/api/member/award/payment/checkout/route'
import { GET } from '@/app/api/member/award/payment/route'

function request(body: unknown) { return new NextRequest('https://top100afl.com/api/member/award/payment/checkout', {method:'POST', body:JSON.stringify(body), headers:{'Content-Type':'application/json'}}) }
beforeEach(() => {
  mocks.user.mockResolvedValue({id:'member-1',email:'member@example.com'})
  mocks.enabled.mockReturnValue(true)
  mocks.rate.mockResolvedValue({success:true})
})
afterEach(() => vi.resetAllMocks())
describe('Bachs member routes', () => {
  it('requires authentication before checkout', async () => {
    mocks.user.mockResolvedValue(null)
    expect((await POST(request({currency:'NGN'}))).status).toBe(401)
    expect(mocks.checkout).not.toHaveBeenCalled()
  })
  it('fails closed when Bachs is not configured', async () => {
    mocks.enabled.mockReturnValue(false)
    expect((await POST(request({currency:'NGN'}))).status).toBe(503)
    expect(mocks.checkout).not.toHaveBeenCalled()
  })
  it('rejects client amount injection', async () => {
    expect((await POST(request({currency:'NGN',amount:1}))).status).toBe(400)
    expect(mocks.checkout).not.toHaveBeenCalled()
  })
  it('passes verified member and currency to the server service', async () => {
    mocks.checkout.mockResolvedValue({checkoutUrl:'https://checkout.bachs.io/c/a',attemptId:'a'})
    const response = await POST(request({currency:'NGN'}))
    expect(response.status).toBe(200)
    expect(mocks.checkout).toHaveBeenCalledWith({id:'member-1',email:'member@example.com'}, 'NGN')
  })
  it('does not expose provider errors or secrets', async () => {
    mocks.checkout.mockRejectedValue(new Error('Authorization sk_live_secret invalid'))
    const response = await POST(request({currency:'USD'}))
    expect(response.status).toBe(502)
    expect(await response.text()).not.toContain('sk_live')
  })
  it('reads only the signed in member payment view', async () => {
    mocks.view.mockResolvedValue({status:'unpaid'})
    expect((await GET()).status).toBe(200)
    expect(mocks.view).toHaveBeenCalledWith('member-1')
  })
  it('requires authentication for payment state', async () => {
    mocks.user.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect(mocks.view).not.toHaveBeenCalled()
  })
})
