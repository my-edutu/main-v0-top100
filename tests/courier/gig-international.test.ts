import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const transport = vi.hoisted(() => vi.fn())
vi.mock('@/lib/courier/http', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/courier/http')>(), gigAuthedRequest: transport,
}))
import { quoteGigInternationalDelivery } from '@/lib/courier/gig-international'
import { deliveryPreviewSchema } from '@/lib/awards/delivery-preview'

const address = deliveryPreviewSchema.parse({ countryCode: 'GB', addressLine1: '12 Test Street', city: 'London', postalCode: 'SW1A 1AA' })
const directory = { success: true, data: { data: [{ CountryId: 62, CountryName: 'UK', CountryCode: 'UK', CountryShortCode: 'GB', IsActive: true, IsDeleted: false, IsInternationalShippingCountry: true }] } }
const prices = { success: true, data: { data: [
  { GrandTotal: 114534.49, Currency: '₦', DeliveryType: 2 },
  { GrandTotal: 87659.49, Currency: '₦', DeliveryType: 0 },
] } }
beforeEach(() => {
  vi.stubEnv('GIG_ENABLED', 'true')
  vi.stubEnv('GIG_API_BASE_URL', 'https://gig.test')
  vi.stubEnv('GIG_API_USERNAME', 'test')
  vi.stubEnv('GIG_API_PASSWORD', 'test')
  vi.stubEnv('GIG_INTL_PACKAGE_WEIGHT_KG', '1')
  vi.stubEnv('GIG_INTL_PACKAGE_LENGTH_CM', '42')
  vi.stubEnv('GIG_INTL_PACKAGE_WIDTH_CM', '29.7')
  vi.stubEnv('GIG_INTL_PACKAGE_HEIGHT_CM', '')
  vi.stubEnv('GIG_INTL_DECLARED_VALUE_NAIRA', '10000')
  transport.mockReset().mockResolvedValueOnce({ ok: true, data: directory }).mockResolvedValueOnce({ ok: true, data: prices })
})
afterEach(() => vi.unstubAllEnvs())

describe('GIG outbound price preview', () => {
  it('resolves the carrier country id and returns the lowest valid NGN quote in minor units', async () => {
    const result = await quoteGigInternationalDelivery(address)
    expect(result).toMatchObject({ ok: true, quote: { amountMinor: 8765949, currency: 'NGN', international: true, deliveryMode: 'home' } })
    expect(transport).toHaveBeenNthCalledWith(1, 'country/get', expect.objectContaining({ method: 'GET' }))
    expect(transport).toHaveBeenNthCalledWith(2, 'intlShipment/price', expect.objectContaining({ method: 'POST', body: expect.objectContaining({
      DestinationCountryId: 62, ReceiverCountryCode: 'GB', ReceiverCountry: 'UK', ReceiverCity: 'London', PickupOptions: 0,
      DeclaredValue: 10000, ShipmentItems: [expect.objectContaining({ InternationalShipmentItemType: 0, Quantity: 1, Weight: 1, Length: 42, Width: 29.7, Value: 10000, IsVolumetric: false })],
    }) }))
    expect(transport.mock.calls[1][1].body.ShipmentItems[0]).not.toHaveProperty('Height')
    expect(JSON.stringify(result)).not.toContain('LogisticCompany')
  })
  it('includes complete volumetric dimensions only when a packed height is configured', async () => {
    vi.stubEnv('GIG_INTL_PACKAGE_HEIGHT_CM', '4')
    expect(await quoteGigInternationalDelivery(address)).toMatchObject({ ok: true })
    expect(transport.mock.calls[1][1].body).toMatchObject({
      ShipmentItems: [{ IsVolumetric: true, Height: 4 }],
      ShipmentPackages: [{ Weight: 1, Length: 42, Width: 29.7, Height: 4 }],
    })
  })
  it('does not quote when GIG is disabled', async () => {
    vi.stubEnv('GIG_ENABLED', 'false')
    expect(await quoteGigInternationalDelivery(address)).toMatchObject({ ok: false, status: 503 })
    expect(transport).not.toHaveBeenCalled()
  })
  it('does not send an invalid configured parcel to the carrier', async () => {
    vi.stubEnv('GIG_INTL_PACKAGE_WEIGHT_KG', '0')
    expect(await quoteGigInternationalDelivery(address)).toMatchObject({ ok: false, status: 503 })
    expect(transport).not.toHaveBeenCalled()
  })
  it('rejects unsupported destinations instead of guessing country ids', async () => {
    transport.mockReset().mockResolvedValue({ ok: true, data: { success: true, data: { data: [] } } })
    expect(await quoteGigInternationalDelivery(address)).toMatchObject({ ok: false, status: 422 })
    expect(transport).toHaveBeenCalledTimes(1)
  })
  it.each([
    { success: false, data: prices.data },
    { success: true, data: { data: [{ GrandTotal: 900, Currency: 'USD' }] } },
    { success: true, data: { data: [{ GrandTotal: 0, Currency: '₦' }] } },
    { success: true, data: { data: [{ GrandTotal: 900 }] } },
  ])('declines failed or unpriced responses without inventing a rate', async payload => {
    transport.mockReset().mockResolvedValueOnce({ ok: true, data: directory }).mockResolvedValueOnce({ ok: true, data: payload })
    expect(await quoteGigInternationalDelivery(address)).toMatchObject({ ok: false, status: 502 })
  })
})
