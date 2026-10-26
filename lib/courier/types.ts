// lib/courier/types.ts
// The courier boundary. Everything above this interface is carrier-agnostic;
// only lib/courier/gig.ts knows GIG's wire format.

/** How the member receives the award. */
export type DeliveryMode = 'home' | 'service_centre'

/**
 * The coordinates and station the carrier priced against. Persisted alongside
 * a quote so booking uses the same verified destination, not a fresh guess.
 */
export type ResolvedDelivery = {
  mode: DeliveryMode
  stationId: number
  latitude: number
  longitude: number
  formattedAddress: string | null
  serviceCentreId?: number
  serviceCentreName?: string
}

export type QuoteInput = {
  recipientName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  country: string
  postalCode?: string
  /** Defaults to home delivery for backwards compatibility. */
  deliveryMode?: DeliveryMode
  /** Required when `deliveryMode` is `service_centre`. */
  serviceCentreId?: number
}

export type QuoteResult =
  | {
      ok: true
      shippingKobo: number
      raw: unknown
      /** ISO currency the carrier quoted in, when it says. Additive; callers may ignore it. */
      currency?: string
      /** Verified destination used for the quote. */
      delivery: ResolvedDelivery
    }
  | { ok: false; reason: string; raw: unknown; code?: string }

export type BookInput = QuoteInput & {
  orderId: string
  /**
   * The destination verified when the order was quoted. Booking reuses this so
   * the parcel goes to the coordinates the member was charged for, even if the
   * geocoder or station directory later changes. Callers should only pass a
   * value that was produced by a successful quote.
   */
  quotedDelivery?: ResolvedDelivery
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
