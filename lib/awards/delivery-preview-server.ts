import { getCourier } from '@/lib/courier'
import { listGigServiceCentres } from '@/lib/courier/gig'
import { quoteGigInternationalDelivery } from '@/lib/courier/gig-international'
import type { DeliveryPreviewInput, DeliveryPreviewQuote } from './delivery-preview'

type PreviewResult = { ok: true; quote: DeliveryPreviewQuote } | { ok: false; status: number; code: string; message: string }

/** Shared read-only carrier pricing for authenticated members and opted-in local previews. */
export async function getLiveDeliveryPreview(details: DeliveryPreviewInput): Promise<PreviewResult> {
  if (details.countryCode !== 'NG') return quoteGigInternationalDelivery(details)
  const courier = getCourier()
  if (courier.name !== 'gig') return {
    ok: false, status: 503, code: 'configuration',
    message: 'Live delivery quotes are temporarily unavailable. Our team can help with pricing.',
  }
  try {
    const quote = await courier.quote({
      recipientName: 'Award recipient', phone: '',
      addressLine1: details.addressLine1, addressLine2: details.addressLine2,
      city: details.city, state: details.state, country: 'Nigeria', postalCode: details.postalCode,
      deliveryMode: details.deliveryMode,
      ...(details.deliveryMode === 'service_centre' ? { serviceCentreId: details.serviceCentreId } : {}),
    })
    if (!quote.ok) return {
      ok: false, status: quote.code === 'carrier_error' ? 502 : 422,
      code: quote.code ?? 'quote_failed', message: quote.reason,
    }
    if (!Number.isSafeInteger(quote.shippingKobo) || quote.shippingKobo <= 0 || (quote.currency && quote.currency !== 'NGN'))
      throw new Error('Unusable carrier price')
    return { ok: true, quote: {
      amountMinor: quote.shippingKobo, currency: 'NGN',
      deliveryMode: quote.delivery.mode, destination: quote.delivery.formattedAddress,
    } }
  } catch {
    return { ok: false, status: 502, code: 'carrier_error', message: 'GIG delivery pricing is temporarily unavailable. Please try again shortly.' }
  }
}

export async function getLiveDeliveryCentres(state: string, city: string) {
  if (getCourier().name !== 'gig') throw new Error('Carrier is unavailable')
  const centres = await listGigServiceCentres({ state, city })
  return centres.map(({ id, name, address }) => ({ id, name, address }))
}
