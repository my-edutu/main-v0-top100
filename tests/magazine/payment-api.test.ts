import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ user: vi.fn(), enabled: vi.fn(), rate: vi.fn(), checkout: vi.fn(), view: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/production-readiness', () => ({ isMagazineCheckoutEnabled: mocks.enabled }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, RATE_LIMITS: { AUTH: {} }, createRateLimitResponse: () => new Response('{}', { status: 429 }) }))
vi.mock('@/lib/magazine/payment-server', () => ({ createMagazineFeatureCheckout: mocks.checkout, getMagazineFeaturePaymentView: mocks.view, MagazinePaymentError: class extends Error { statusCode = 409 } }))

import { POST } from '@/app/api/member/magazine/payment/checkout/route'
import { GET } from '@/app/api/member/magazine/payment/route'

function request(body: unknown) {
  return new NextRequest('https://top100afl.com/api/member/magazine/payment/checkout', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  mocks.user.mockResolvedValue({ id: 'member-1', email: 'member@example.com' })
  mocks.enabled.mockReturnValue(true)
  mocks.rate.mockResolvedValue({ success: true })
})
afterEach(() => vi.resetAllMocks())

describe('separate magazine payment routes', () => {
  it('checks the magazine switch independently before checkout', async () => {
    mocks.enabled.mockReturnValue(false)
    expect((await POST(request({ currency: 'NGN' }))).status).toBe(503)
    expect(mocks.checkout).not.toHaveBeenCalled()
  })

  it('rejects client-controlled pricing and derives checkout currency from the submitted country', async () => {
    expect((await POST(request({ name: 'Amara Okafor', email: 'amara@example.com', countryCode: 'NG', currency: 'USD' }))).status).toBe(400)
    expect(mocks.checkout).not.toHaveBeenCalled()
    mocks.checkout.mockResolvedValue({ checkoutUrl: 'https://checkout.bachs.io/c/mag', attemptId: 'attempt-1' })
    const response = await POST(request({ name: 'Amara Okafor', email: 'amara@example.com', countryCode: 'GB' }))
    expect(response.status).toBe(200)
    expect(mocks.checkout).toHaveBeenCalledWith({ id: 'member-1' }, { name: 'Amara Okafor', email: 'amara@example.com', countryCode: 'GB' })
  })

  it('requires valid checkout identity and a supported country', async () => {
    expect((await POST(request({ name: '', email: 'bad-email', countryCode: 'ZZ' }))).status).toBe(400)
    expect(mocks.checkout).not.toHaveBeenCalled()
  })

  it('returns existing payment state and the separate switch state to the signed-in member', async () => {
    mocks.view.mockResolvedValue({ orderStatus: 'paid', applicationEligible: true })
    mocks.enabled.mockReturnValue(false)
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ payment: { orderStatus: 'paid', applicationEligible: true, checkoutEnabled: false } })
    expect(mocks.view).toHaveBeenCalledWith('member-1')
  })

  it('requires authentication for checkout and status', async () => {
    mocks.user.mockResolvedValue(null)
    expect((await POST(request({ currency: 'NGN' }))).status).toBe(401)
    expect((await GET()).status).toBe(401)
    expect(mocks.view).not.toHaveBeenCalled()
  })
})
