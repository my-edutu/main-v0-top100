import type { AwardPaymentView } from '@/lib/awards/payment'
import type { DeliveryOrderView, IncludedDeliveryView } from './types'

export function deliveryQuoteExpired(delivery: Pick<DeliveryOrderView, 'expiresAt'>, now = Date.now()) {
  const expiresAt = new Date(delivery.expiresAt).getTime()
  return !Number.isFinite(expiresAt) || expiresAt <= now
}

export function canEditDelivery(delivery: Pick<DeliveryOrderView, 'status' | 'expiresAt'> | null, now = Date.now()) {
  if (!delivery) return true
  return delivery.status === 'expired' || (delivery.status === 'quoted' && deliveryQuoteExpired(delivery, now)) || delivery.status === 'quoted'
}

export function canPayDelivery(delivery: Pick<DeliveryOrderView, 'status' | 'expiresAt'> | null, now = Date.now()) {
  return Boolean(delivery && delivery.status === 'quoted' && !deliveryQuoteExpired(delivery, now))
}

/** An open hosted checkout can be resumed; the server re-verifies its status. */
export function canResumeDelivery(delivery: Pick<DeliveryOrderView, 'status'> | null) {
  return delivery?.status === 'open'
}

function nullableText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const result = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
  return result || null
}

/** Parse the additive legacy-delivery response without trusting URL schemes from the browser. */
export function parseIncludedDelivery(value: unknown): IncludedDeliveryView | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const waybill = nullableText(record.waybill, 160)
  let trackingUrl: string | null = null
  const rawTrackingUrl = nullableText(record.trackingUrl, 2_048)
  if (rawTrackingUrl) {
    try {
      const url = new URL(rawTrackingUrl)
      if (url.protocol === 'https:' && !url.username && !url.password) trackingUrl = url.href
    } catch {
      trackingUrl = null
    }
  }
  return { waybill, trackingUrl }
}

export function shouldShowIncludedDelivery(includedDelivery: IncludedDeliveryView | null, delivery: DeliveryOrderView | null) {
  return Boolean(includedDelivery && !delivery)
}

export function deliveryCheckoutBody(deliveryId: string) {
  return { deliveryId }
}

export function deliveryReconcileRequest() {
  return { method: 'POST' as const }
}

export function shouldReconcileDeliveryReturn(search: string) {
  return new URLSearchParams(search).get('deliveryPayment') === 'done'
}

export function isHostedCheckoutUrl(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function formatDeliveryAmount(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en', {
    style: 'currency',
    currency,
    // Delivery quotes are stored in minor units. GIG can return kobo, so do
    // not let Intl round a quote such as ₦5,135.50 to ₦5,136.
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountMinor / 100)
}

export function deliveryPaymentWarning(input: { amountMinor: number; email: string; deliveryId: string }) {
  const amount = formatDeliveryAmount(input.amountMinor, 'NGN')
  const decimalAmount = `${Math.floor(input.amountMinor / 100)}.${String(input.amountMinor % 100).padStart(2, '0')}`
  const kobo = input.amountMinor.toLocaleString('en-NG')
  const email = input.email.trim() || 'the email on your Top100 account'
  return `Before you continue, enter exactly ${decimalAmount} NGN (${amount}; ${kobo} kobo) on the Bachs payment page. Use your Top100 account email: ${email}. This public link has no delivery reference and a redirect or click is not payment confirmation. After paying, contact Top100 support at info@top100afl.com with the Bachs transaction reference and delivery ID ${input.deliveryId}. Do not pay a different amount.`
}

export function deliveryDestinationLabel(delivery: Pick<DeliveryOrderView, 'deliveryMode' | 'destination' | 'addressLine1' | 'addressLine2' | 'city' | 'state' | 'postalCode' | 'country'>) {
  if (delivery.deliveryMode === 'service_centre' && delivery.destination.trim()) return delivery.destination.trim()
  const parts = [delivery.addressLine1, delivery.addressLine2, delivery.city, delivery.state, delivery.postalCode, delivery.country]
    .map(value => value.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : delivery.destination
}

export function awardDeliveryBill(
  awardPayment: NonNullable<AwardPaymentView['confirmedPayment']> | null,
  delivery: Pick<DeliveryOrderView, 'amountMinor' | 'currency'> | null,
) {
  return {
    award: awardPayment
      ? { label: 'Award fee', amountMinor: awardPayment.amountMinor, currency: awardPayment.currency, status: 'paid' as const }
      : null,
    delivery: delivery
      ? { label: 'Delivery fee', amountMinor: delivery.amountMinor, currency: delivery.currency, status: 'separate' as const }
      : null,
  }
}
