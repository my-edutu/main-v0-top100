import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: vi.fn(), rate: vi.fn(), payment: vi.fn(),
  courier: { name: 'gig', quote: vi.fn() },
  international: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.rate,
  RATE_LIMITS: { QUERY: {} },
  createRateLimitResponse: () => new Response('{}', { status: 429 }),
}))
vi.mock('@/lib/courier', () => ({ getCourier: () => mocks.courier }))
vi.mock('@/lib/courier/gig-international', () => ({ quoteGigInternationalDelivery: mocks.international }))
vi.mock('@/lib/awards/payment-server', () => ({ getAwardPaymentView: mocks.payment }))

import { POST } from '@/app/api/member/award/delivery-quote/route'

const address = {
  addressLine1: '12 Adeola Odeku Street', city: 'Victoria Island', state: 'Lagos', country: 'Nigeria',
}
const resolved = {
  mode: 'home', stationId: 4, latitude: 6.4281, longitude: 3.4219,
  formattedAddress: '12 Adeola Odeku Street, Victoria Island, Lagos',
}
function request(body: unknown) {
  return new NextRequest('https://top100afl.com/api/member/award/delivery-quote', {
    method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.user.mockResolvedValue({ id: 'member-with-no-order' })
  mocks.rate.mockResolvedValue({ success: true })
  mocks.payment.mockResolvedValue({ status: 'unpaid', confirmedPayment: null })
  mocks.courier.name = 'gig'
  mocks.courier.quote.mockResolvedValue({
    ok: true, shippingKobo: 350_000, currency: 'NGN', delivery: resolved,
    raw: { privateCarrierData: 'must not be returned' },
  })
  mocks.international.mockResolvedValue({ ok: true, quote: { amountMinor: 8_500_000, currency: 'NGN', deliveryMode: 'home', international: true, destination: '12 Test Street, Toronto, Canada' } })
})

describe('standalone delivery cost check', () => {
  it('returns a live home quote for an unpaid member with no order', async () => {
    const response = await POST(request(address))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ quote: {
      amountMinor: 350_000, currency: 'NGN', deliveryMode: 'home', destination: resolved.formattedAddress,
    } })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('works even when the award payment service is unavailable', async () => {
    mocks.payment.mockRejectedValue(new Error('Payment tables are not configured'))
    expect((await POST(request(address))).status).toBe(200)
  })

  it('routes a foreign address to outbound international pricing without Nigerian geocoding', async () => {
    const response = await POST(request({ addressLine1: '12 Test Street', city: 'Toronto', state: 'Ontario', provinceCode: 'ON', countryCode: 'CA', postalCode: 'M5V 3L9' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ quote: { international: true, amountMinor: 8_500_000, currency: 'NGN' } })
    expect(mocks.international).toHaveBeenCalledWith(expect.objectContaining({ countryCode: 'CA', country: 'Canada', provinceCode: 'ON' }))
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('does not require a street address for verified centre collection', async () => {
    mocks.courier.quote.mockResolvedValue({ ok: true, shippingKobo: 250_000, delivery: {
      ...resolved, mode: 'service_centre', serviceCentreId: 18, formattedAddress: 'GIG Ikotun centre',
    } })
    const response = await POST(request({
      city: 'Ikotun', state: 'Lagos', deliveryMode: 'service_centre', serviceCentreId: 18,
    }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ quote: {
      amountMinor: 250_000, currency: 'NGN', deliveryMode: 'service_centre', destination: 'GIG Ikotun centre',
    } })
  })

  it('requires a signed-in member', async () => {
    mocks.user.mockResolvedValue(null)
    expect((await POST(request(address))).status).toBe(401)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('limits requests before contacting GIG', async () => {
    mocks.rate.mockResolvedValue({ success: false })
    expect((await POST(request(address))).status).toBe(429)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it.each([
    { ...address, addressLine1: '' },
    { ...address, state: 'Atlantis' },
    { ...address, country: 'Atlantis' },
    { ...address, countryCode: 'CA' },
    { ...address, country: 'Ghana', deliveryMode: 'service_centre', serviceCentreId: 18 },
    { ...address, deliveryMode: 'service_centre' },
    { ...address, deliveryMode: 'service_centre', serviceCentreId: -1 },
    { ...address, serviceCentreId: 18 },
  ])('rejects an invalid destination before requesting a price: %j', async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(mocks.courier.quote).not.toHaveBeenCalled()
  })

  it('reports unavailable live pricing without inventing a price', async () => {
    mocks.courier.name = 'manual'
    const response = await POST(request(address))
    expect(response.status).toBe(503)
    expect(await response.json()).not.toHaveProperty('quote')
  })

  it('returns an address correction when geocoding cannot locate the destination', async () => {
    mocks.courier.quote.mockResolvedValue({ ok: false, code: 'no_match', reason: 'Check your street address.', raw: null })
    const response = await POST(request(address))
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ code: 'no_match', message: 'Check your street address.' })
  })

  it('handles carrier failures without exposing private errors', async () => {
    mocks.courier.quote.mockRejectedValue(new Error('private carrier configuration'))
    const response = await POST(request(address))
    expect(response.status).toBe(502)
    const body = await response.json()
    expect(body).not.toHaveProperty('quote')
    expect(body.message).not.toContain('private carrier configuration')
  })
})
