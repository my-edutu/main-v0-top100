// lib/awards.ts
// Client-side wrappers around /api/member/award*. Safe to import into client
// components — it contains no secrets and no server-only imports.
import type { AwardStatus } from '@/lib/awards/status'

export type AwardOrder = {
  id: string
  status: AwardStatus
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  postalCode: string
  awardAmountKobo: number
  shippingAmountKobo: number | null
  totalAmountKobo: number | null
  currency: string
  quoteExpiresAt: string | null
  waybill: string | null
  trackingUrl: string | null
  deliveryStatus: string | null
  paidAt: string | null
  createdAt: string
}

export type AwardState = {
  order: AwardOrder | null
  awardPriceKobo: number
  needsClaim: boolean
}

export type DeliveryDetails = {
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode?: string
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || 'Request failed. Please try again.')
  return data
}

export async function fetchAwardOrder(): Promise<AwardState> {
  const res = await fetch('/api/member/award', { cache: 'no-store' })
  return (await jsonOrThrow(res)) as AwardState
}

/** Save delivery details and get a shipping quote. */
export async function submitDeliveryDetails(
  details: DeliveryDetails,
): Promise<{ order: AwardOrder; message: string | null }> {
  const res = await fetch('/api/member/award/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  })
  return (await jsonOrThrow(res)) as { order: AwardOrder; message: string | null }
}

/** Start payment. Returns the Paystack URL the browser should navigate to. */
export async function startAwardCheckout(): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await fetch('/api/member/award/checkout', { method: 'POST' })
  return (await jsonOrThrow(res)) as { authorizationUrl: string; reference: string }
}

export async function refreshAwardTracking(): Promise<{ order: AwardOrder }> {
  const res = await fetch('/api/member/award/track', { cache: 'no-store' })
  return (await jsonOrThrow(res)) as { order: AwardOrder }
}
