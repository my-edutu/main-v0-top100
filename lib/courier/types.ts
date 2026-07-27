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
  | {
      ok: true
      shippingKobo: number
      raw: unknown
      /** ISO currency the carrier quoted in, when it says. Additive; callers may ignore it. */
      currency?: string
    }
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

/**
 * The subset of `AwardStatus` a carrier may assert, plus `'unknown'`.
 * `'unknown'` means "write nothing" — `app/api/member/award/track/route.ts`
 * depends on that, so an unrecognised carrier status must never be guessed
 * into one of the other three.
 */
export type CourierStatus = 'dispatched' | 'in_transit' | 'delivered' | 'unknown'

export type TrackResult = {
  status: CourierStatus
  description: string
  raw: unknown
  /** The raw carrier status text that produced `status`, for admin diagnostics. Additive. */
  carrierStatus?: string | null
}

export interface CourierAdapter {
  readonly name: string
  quote(input: QuoteInput): Promise<QuoteResult>
  book(input: BookInput): Promise<BookResult>
  track(waybill: string): Promise<TrackResult>
}
