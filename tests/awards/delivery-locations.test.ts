import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ gig: vi.fn(), fetch: vi.fn() }))
vi.mock('@/lib/courier/http', async original => ({ ...await original<typeof import('@/lib/courier/http')>(), gigAuthedRequest: mocks.gig }))
import { getDeliveryRegions, getDeliveryLocationOptions, suggestDeliveryCities } from '@/lib/awards/delivery-locations-server'
import { getGigQuoteCountries } from '@/lib/courier/gig-destinations'

beforeEach(() => { vi.resetAllMocks(); vi.stubEnv('GEOAPIFY_API_KEY', 'server-only-test-key'); vi.stubGlobal('fetch', mocks.fetch) })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
it('returns only regions for the selected country, including Benin departments and Canadian codes', () => {
  const benin = getDeliveryRegions('BJ')
  expect(benin).toContainEqual({ name: 'Littoral Department', code: 'LI' })
  expect(benin.some(region => region.name === 'Ontario')).toBe(false)
  expect(getDeliveryRegions('CA')).toContainEqual({ name: 'Ontario', code: 'ON' })
  expect(getDeliveryRegions('NG')).toHaveLength(37)
})
it('uses the active live international flag rather than assuming every country has automatic rates', async () => {
  mocks.gig.mockResolvedValue({ ok: true, data: { data: [
    { CountryId: 1, CountryName: 'NIGERIA', CountryShortCode: 'NG', IsActive: true, IsInternationalShippingCountry: true },
    { CountryId: 62, CountryName: 'UK', CountryShortCode: 'GB', IsActive: true, IsInternationalShippingCountry: true },
    { CountryId: 4, CountryName: 'GHANA', CountryShortCode: 'GH', IsActive: true, IsInternationalShippingCountry: false },
    { CountryId: 5, CountryName: 'BENIN', CountryShortCode: 'BJ', IsActive: false, IsInternationalShippingCountry: true },
  ] } })
  expect((await getGigQuoteCountries()).map(country => country.code)).toEqual(['NG', 'GB'])
})
it('does not turn a failed country lookup into an empty supported-country list', async () => {
  mocks.gig.mockResolvedValue({ ok: false })
  await expect(getGigQuoteCountries()).rejects.toThrow()
})
it('keeps country availability unknown on failure and allows the next lookup to recover', async () => {
  mocks.gig.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, data: { data: [
    { CountryId: 36, CountryName: 'CANADA', CountryShortCode: 'CA', IsActive: true, IsInternationalShippingCountry: true },
  ] } })
  expect((await getDeliveryLocationOptions('BJ')).quoteCountries).toBeNull()
  expect((await getDeliveryLocationOptions('CA')).quoteCountries).toEqual(['NG', 'CA'])
})
it('filters city suggestions by the selected country and province and keeps API credentials server-side', async () => {
  mocks.fetch.mockResolvedValue(Response.json({ results: [
    { city: 'Toronto', state: 'Ontario', state_code: 'ON', country_code: 'ca', formatted: 'Toronto, Ontario, Canada' },
    { city: 'Vancouver', state: 'British Columbia', state_code: 'BC', country_code: 'ca' },
    { city: 'Toronto', state: 'Ohio', state_code: 'OH', country_code: 'us' },
  ] }))
  const result = await suggestDeliveryCities({ countryCode: 'CA', region: 'Ontario', query: 'Tor' })
  expect(result).toEqual([{ name: 'Toronto', label: 'Toronto, Ontario, Canada' }])
  const url = new URL(String(mocks.fetch.mock.calls[0][0]))
  expect(url.searchParams.get('filter')).toBe('countrycode:ca')
  expect(url.searchParams.get('text')).toBe('Tor')
  expect(url.searchParams.get('type')).toBe('city')
  expect(JSON.stringify(result)).not.toContain('server-only-test-key')
})
