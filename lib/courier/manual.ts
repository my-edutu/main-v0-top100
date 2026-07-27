// lib/courier/manual.ts
// Used when no carrier is configured. It never invents a shipping price —
// it declines to quote, which routes the order to `quote_failed` so the admin
// team sets a price by hand. Silently guessing a number here would charge a
// member the wrong amount.
import type { BookInput, BookResult, CourierAdapter, QuoteInput, QuoteResult, TrackResult } from './types'

export const manualCourier: CourierAdapter = {
  name: 'manual',

  async quote(_input: QuoteInput): Promise<QuoteResult> {
    return {
      ok: false,
      reason: 'Automated delivery quotes are unavailable. Our team will contact you with a delivery cost.',
      raw: null,
    }
  },

  async book(input: BookInput): Promise<BookResult> {
    throw new Error(
      `No courier is configured, so order ${input.orderId} cannot be dispatched automatically. ` +
        'Set GIG_API_BASE_URL, GIG_API_USERNAME, and GIG_API_PASSWORD or dispatch this order manually from /admin/awards.',
    )
  },

  async track(_waybill: string): Promise<TrackResult> {
    return { status: 'unknown', description: 'Tracking is unavailable for manually dispatched orders.', raw: null }
  },
}
