import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const live = vi.hoisted(() => ({ quote: vi.fn(), centres: vi.fn(), rate: vi.fn() }))
vi.mock('@/lib/courier', () => ({ getCourier: () => ({ name: 'gig', quote: live.quote }) }))
vi.mock('@/lib/courier/gig', () => ({ listGigServiceCentres: live.centres }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: live.rate, RATE_LIMITS: { QUERY: {} },
  createRateLimitResponse: () => new Response('{}', { status: 429 }),
}))
import { handleDemoMemberRequest } from '@/lib/dev-dashboard/handler'
import { createDemoDashboardStore } from '@/lib/dev-dashboard/store'
import { DEV_DASHBOARD_COOKIE, DEV_DASHBOARD_COOKIE_VALUE } from '@/lib/dev-dashboard/auth'

beforeEach(() => {
  vi.stubEnv('DEV_DASHBOARD_LIVE_DELIVERY_QUOTES', 'false')
  live.quote.mockReset().mockResolvedValue({ ok: true, shippingKobo: 432100, currency: 'NGN', delivery: { mode: 'home', formattedAddress: 'Verified delivery address' } })
  live.centres.mockReset().mockResolvedValue([{ id: 18, name: 'GIG centre', address: 'Verified centre address' }])
  live.rate.mockReset().mockResolvedValue({ success: true })
})
afterEach(() => vi.unstubAllEnvs())

const headers = { host: 'localhost:3025', cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`, 'Content-Type': 'application/json' }
const destination = { addressLine1: '12 Test Street', state: 'Lagos', city: 'Ikeja', country: 'Nigeria' }

describe('local delivery price preview', () => {
  it('uses the live courier amount when enabled locally, with no sample fallback or order mutation', async () => {
    vi.stubEnv('DEV_DASHBOARD_LIVE_DELIVERY_QUOTES', 'true')
    const store = createDemoDashboardStore()
    const response = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/delivery-quote', {
      method: 'POST', headers, body: JSON.stringify(destination),
    }), ['award', 'delivery-quote'], store, 'development')
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.quote.amountMinor).toBe(432100)
    expect(body.quote).not.toHaveProperty('sample')
    expect(live.quote).toHaveBeenCalledWith(expect.objectContaining(destination))
    expect(store.awardOrder).toBeNull()
  })
  it('returns carrier address errors instead of a made-up price in live mode', async () => {
    vi.stubEnv('DEV_DASHBOARD_LIVE_DELIVERY_QUOTES', 'true')
    live.quote.mockResolvedValue({ ok: false, code: 'no_match', reason: 'Check your street address.' })
    const response = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/delivery-quote', {
      method: 'POST', headers, body: JSON.stringify(destination),
    }), ['award', 'delivery-quote'], createDemoDashboardStore(), 'development')
    expect(response.status).toBe(422)
    expect(await response.json()).toEqual({ code: 'no_match', message: 'Check your street address.' })
  })
  it('lists real carrier centres when live pricing is enabled', async () => {
    vi.stubEnv('DEV_DASHBOARD_LIVE_DELIVERY_QUOTES', 'true')
    const response = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/service-centres?state=Lagos&city=Ikeja', { headers }), ['award', 'service-centres'], createDemoDashboardStore(), 'development')
    expect(await response.json()).toEqual({ serviceCentres: [{ id: 18, name: 'GIG centre', address: 'Verified centre address' }] })
  })
  it('never permits local-demo courier access in production even when the flag is set', async () => {
    vi.stubEnv('DEV_DASHBOARD_LIVE_DELIVERY_QUOTES', 'true')
    const response = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/delivery-quote', {
      method: 'POST', headers, body: JSON.stringify(destination),
    }), ['award', 'delivery-quote'], createDemoDashboardStore(), 'production')
    expect(response.status).toBe(401)
    expect(live.quote).not.toHaveBeenCalled()
  })
  it.each([
    { country: 'Nigeria', state: 'Lagos', city: 'Ikeja', amountMinor: 750000 },
    { country: 'Canada', state: 'Ontario', city: 'Toronto', amountMinor: 9000000 },
  ])('returns a clearly labelled sample quote for $country without creating an award order', async location => {
    const store = createDemoDashboardStore()
    const response = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/delivery-quote', {
      method: 'POST',
      headers: { host: 'localhost:3025', cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressLine1: '12 Test Street', state: location.state, city: location.city, country: location.country }),
    }), ['award', 'delivery-quote'], store, 'development')
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ quote: { sample: true, currency: 'NGN', amountMinor: location.amountMinor } })
    expect(store.awardOrder).toBeNull()
    expect(store.awardPayment.status).toBe('unpaid')
  })
  it('lists a labelled sample collection centre and prices it without live courier calls', async () => {
    const store = createDemoDashboardStore()
    const headers = { host: 'localhost:3025', cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`, 'Content-Type': 'application/json' }
    const centres = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/service-centres?state=Lagos&city=Ikeja', { headers }), ['award', 'service-centres'], store, 'development')
    expect(centres.status).toBe(200)
    expect(await centres.json()).toMatchObject({ serviceCentres: [{ id: 9001, name: 'Sample GIG collection centre' }] })
    const quote = await handleDemoMemberRequest(new NextRequest('http://localhost:3025/api/member/award/delivery-quote', {
      method: 'POST', headers, body: JSON.stringify({ state: 'Lagos', city: 'Ikeja', deliveryMode: 'service_centre', serviceCentreId: 9001 }),
    }), ['award', 'delivery-quote'], store, 'development')
    expect(quote.status).toBe(200)
    expect(await quote.json()).toMatchObject({ quote: { sample: true, amountMinor: 500000, deliveryMode: 'service_centre' } })
    expect(store.awardOrder).toBeNull()
  })
})
