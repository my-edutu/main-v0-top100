// lib/courier/types.ts
// The courier boundary. Everything above this interface is carrier-agnostic;
// only lib/courier/gig.ts knows GIG's wire format.

export type QuoteInput = {
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode?: string
}

export type QuoteResult =
  | { ok: true; shippingKobo: number; raw: unknown }
  | { ok: false; reason: string; raw: unknown }

export type BookInput = QuoteInput & {
  orderId: string
  email: string
}

export type BookResult = {
  waybill: string
  trackingUrl: string | null
  raw: unknown
}

export type TrackResult = {
  status: 'dispatched' | 'in_transit' | 'delivered' | 'unknown'
  description: string
  raw: unknown
}

export interface CourierAdapter {
  readonly name: string
  quote(input: QuoteInput): Promise<QuoteResult>
  book(input: BookInput): Promise<BookResult>
  track(waybill: string): Promise<TrackResult>
}
