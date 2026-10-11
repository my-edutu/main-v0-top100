import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ checkout: vi.fn(), view: vi.fn() }))
vi.mock('@/lib/magazine/guest-payment-server', () => ({ createPublicMagazineFeatureCheckout: mocks.checkout, getPublicMagazinePaymentView: mocks.view, MagazinePaymentError: class extends Error { statusCode = 409 } }))
vi.mock('@/lib/production-readiness', () => ({ isMagazineCheckoutEnabled: () => true }))
vi.mock('@/lib/rate-limit', () => ({ RATE_LIMITS: { AUTH: {} }, getClientIdentifier: () => 'test', checkRateLimit: async () => ({ success: true }), createRateLimitResponse: () => new Response('', { status: 429 }) }))
import { POST } from '@/app/api/public/magazine/payment/checkout/route'

const token = 'a'.repeat(43)
function request() { return new NextRequest('https://top100afl.com/api/public/magazine/payment/checkout', { method: 'POST', headers: { 'content-type': 'application/json', cookie: `afl_magazine_guest_access=${token}` }, body: JSON.stringify({ name: 'Guest Applicant', email: 'guest@example.com', countryCode: 'NG' }) }) }
beforeEach(() => {
  mocks.view.mockResolvedValue({ customer: { email: 'guest@example.com' } })
  mocks.checkout.mockResolvedValue({ checkoutUrl: 'https://checkout.bachs.io/c/example', attemptId: 'example' })
})
afterEach(() => vi.resetAllMocks())

describe('public checkout continuation', () => {
  it('keeps the existing access cookie for the same applicant', async () => {
    expect((await POST(request())).status).toBe(200)
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ email: 'guest@example.com' }), token)
  })
  it('creates a fresh access cookie when another applicant uses a shared browser', async () => {
    mocks.view.mockResolvedValue({ customer: { email: 'someone-else@example.com' } })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(mocks.checkout.mock.calls[0][1]).not.toBe(token)
    expect(response.cookies.get('afl_magazine_guest_access')?.value).toBe(mocks.checkout.mock.calls[0][1])
  })
  it('returns a recovery step instead of a red conflict error', async () => {
    mocks.checkout.mockResolvedValue({ nextStep: 'recover' })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ nextStep: 'recover' })
  })
  it('refreshes confirmed or pending payment state without starting another checkout', async () => {
    mocks.checkout.mockResolvedValue({ nextStep: 'refresh' })
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ nextStep: 'refresh' })
  })
})
