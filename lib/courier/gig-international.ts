import type { DeliveryPreviewInput, DeliveryPreviewQuote } from '@/lib/awards/delivery-preview'
import { env, envFlag, gigAuthedRequest, pickFirstNumber, pickValue } from './http'
import { getGigQuoteCountries } from './gig-destinations'

type Result = { ok: true; quote: DeliveryPreviewQuote } | { ok: false; status: number; code: string; message: string }
const unavailable = (): Result => ({ ok: false, status: 502, code: 'carrier_error', message: 'International delivery pricing is temporarily unavailable. Please try again shortly or contact Top100.' })
function rows(payload: unknown): Record<string, unknown>[] {
  const list = ['data.data', 'data', 'Object'].map(path => pickValue(payload, path)).find(Array.isArray)
  return Array.isArray(list) ? list.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object') : []
}

/** Read-only Nigeria-to-overseas pricing. This never books a shipment. */
export async function quoteGigInternationalDelivery(input: DeliveryPreviewInput): Promise<Result> {
  if (!envFlag('GIG_ENABLED', false) || !process.env.GIG_API_BASE_URL || !process.env.GIG_API_USERNAME || !process.env.GIG_API_PASSWORD)
    return { ok: false, status: 503, code: 'configuration', message: 'International delivery pricing is being prepared. Contact Top100 for a delivery quote.' }
  const number = (name: string, fallback: string) => Number(env(name, fallback))
  // Confirmed by Top100: 1 kg, A3 face, ₦10,000 declared replacement value.
  // Thickness is optional until the outer packed measurement is confirmed.
  const weight = number('GIG_INTL_PACKAGE_WEIGHT_KG', '1')
  const length = number('GIG_INTL_PACKAGE_LENGTH_CM', '42')
  const width = number('GIG_INTL_PACKAGE_WIDTH_CM', '29.7')
  const height = process.env.GIG_INTL_PACKAGE_HEIGHT_CM?.trim() ? number('GIG_INTL_PACKAGE_HEIGHT_CM', '') : undefined
  const value = number('GIG_INTL_DECLARED_VALUE_NAIRA', '10000')
  if (![weight, length, width, value, ...(height === undefined ? [] : [height])].every(value => Number.isFinite(value) && value > 0))
    return { ok: false, status: 503, code: 'configuration', message: 'International delivery pricing is being prepared. Contact Top100 for a delivery quote.' }
  try {
    const country = (await getGigQuoteCountries()).find(country => country.code === input.countryCode)
    if (!country)
      return { ok: false, status: 422, code: 'destination_unavailable', message: `GIG automatic pricing is not enabled for ${input.country} on our account. Contact Top100 for a delivery quote.` }
    const dimensions = { Weight: weight, Length: length, Width: width, ...(height === undefined ? {} : { Height: height }) }
    const response = await gigAuthedRequest('intlShipment/price', {
      method: 'POST', retries: 1,
      body: {
        DestinationCountryId: country.id,
        ReceiverCountry: country.name, ReceiverCountryCode: input.countryCode,
        ReceiverAddress: [input.addressLine1, input.addressLine2].filter(Boolean).join(', '),
        ReceiverCity: input.city, ReceiverPostalCode: input.postalCode,
        ...(input.provinceCode ? { ReceiverStateOrProvinceCode: input.provinceCode } : {}),
        PickupOptions: 0, DeclaredValue: value,
        IsVacuumSeal: false, IsPhytosanitaryCertification: false,
        ShipmentItems: [{ InternationalShipmentItemType: 0, Description: env('GIG_ITEM_DESCRIPTION', 'Top100 Africa Future Leaders award'), Quantity: 1, ...dimensions, IsVolumetric: height !== undefined, Value: value }],
        ...(height === undefined ? {} : { ShipmentPackages: [dimensions] }),
      },
    })
    if (!response.ok || pickValue(response.data, 'success') === false) return unavailable()
    const amounts = rows(response.data).flatMap(rate => {
      if (!['NGN', '₦'].includes(String(rate.Currency ?? '').trim().toUpperCase())) return []
      const amount = pickFirstNumber(rate, 'GrandTotal')?.value
      const minor = typeof amount === 'number' ? Math.round(amount * 100) : NaN
      return Number.isSafeInteger(minor) && minor > 0 ? [minor] : []
    })
    if (!amounts.length) return unavailable()
    return { ok: true, quote: {
      amountMinor: Math.min(...amounts), currency: 'NGN', deliveryMode: 'home', international: true,
      destination: [input.addressLine1, input.addressLine2, input.city, input.state, input.postalCode, input.country].filter(Boolean).join(', '),
    } }
  } catch {
    // Never return provider errors, account data or destination details in logs.
    return unavailable()
  }
}
