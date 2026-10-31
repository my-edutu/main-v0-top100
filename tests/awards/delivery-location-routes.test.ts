import { NextRequest } from 'next/server'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ user: vi.fn(), rate: vi.fn(), options: vi.fn(), cities: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.rate, RATE_LIMITS: { QUERY: {} }, createRateLimitResponse: () => Response.json({}, { status: 429 }) }))
vi.mock('@/lib/awards/delivery-locations-server', () => ({ getDeliveryLocationOptions: mocks.options, suggestDeliveryCities: mocks.cities }))
import { GET as options } from '@/app/api/member/award/delivery-options/route'
import { GET as cities } from '@/app/api/member/award/delivery-cities/route'
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: 'member-1' }); mocks.rate.mockResolvedValue({ success: true }); mocks.options.mockResolvedValue({ regions: [{ name: 'Ontario', code: 'ON' }], quoteCountries: ['NG', 'CA'] }); mocks.cities.mockResolvedValue([{ name: 'Toronto', label: 'Toronto, Ontario, Canada' }]) })
const request = (query: string) => new NextRequest(`http://localhost/api/member/award/delivery-options?${query}`)
it('requires member authentication for both location endpoints', async () => {
  mocks.user.mockResolvedValue(null)
  expect((await options(request('countryCode=CA'))).status).toBe(401)
  expect((await cities(request('countryCode=CA&query=Tor'))).status).toBe(401)
  expect(mocks.options).not.toHaveBeenCalled()
})
it('returns regions and current account coverage without caching member responses publicly', async () => {
  const response = await options(request('countryCode=CA'))
  expect(await response.json()).toMatchObject({ regions: [{ name: 'Ontario', code: 'ON' }], quoteCountries: ['NG', 'CA'] })
  expect(response.headers.get('Cache-Control')).toBe('private, no-store')
})
it('rejects invalid country codes and short city searches', async () => {
  expect((await options(request('countryCode=XX'))).status).toBe(400)
  expect((await cities(request('countryCode=CA&query=T'))).status).toBe(400)
  expect(mocks.cities).not.toHaveBeenCalled()
})
it('offers a manual entry fallback on lookup failure without exposing provider errors', async () => {
  mocks.cities.mockRejectedValue(new Error('apiKey=private-key'))
  const response = await cities(request('countryCode=CA&region=Ontario&query=Tor'))
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('private-key')
})
it('rate limits city suggestions before provider lookup', async () => {
  mocks.rate.mockResolvedValue({ success: false })
  expect((await cities(request('countryCode=CA&query=Tor'))).status).toBe(429)
  expect(mocks.cities).not.toHaveBeenCalled()
})
