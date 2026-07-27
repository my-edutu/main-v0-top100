// lib/courier/gig.ts
// Placeholder for GIG Logistics adapter. Real implementation deferred to Task 6 pending API docs.
// Until then, this adapter declines to quote and throws on dispatch, even though GIG credentials
// are configured. The admin team must handle both quoting and dispatch manually.
import { manualCourier } from './manual'
import type { BookInput, CourierAdapter, QuoteInput } from './types'

export const gigCourier: CourierAdapter = {
  name: 'gig-unconfigured',

  async quote(_input: QuoteInput) {
    return {
      ok: false,
      reason: 'Automated delivery quotes are unavailable. Our team will contact you with a delivery cost.',
      raw: null,
    }
  },

  async book(input: BookInput) {
    throw new Error(
      `The GIG Logistics adapter is not yet implemented. Order ${input.orderId} cannot be dispatched automatically. ` +
        'Please handle dispatch manually from /admin/awards.',
    )
  },

  async track(waybill: string) {
    return manualCourier.track(waybill)
  },
}
