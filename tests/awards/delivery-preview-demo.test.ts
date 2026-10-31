import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { handleDemoMemberRequest } from '@/lib/dev-dashboard/handler'
import { createDemoDashboardStore } from '@/lib/dev-dashboard/store'
import { DEV_DASHBOARD_COOKIE, DEV_DASHBOARD_COOKIE_VALUE } from '@/lib/dev-dashboard/auth'

describe('local delivery price preview', () => {
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
