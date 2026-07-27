// lib/courier/index.ts
import { gigCourier } from './gig'
import { manualCourier } from './manual'
import type { CourierAdapter } from './types'

export * from './types'

/**
 * GIG when it is configured, manual otherwise. Selection is by env presence so
 * a missing credential degrades to "admin quotes it by hand" rather than to a
 * crash mid-checkout.
 */
export function getCourier(): CourierAdapter {
  if (process.env.GIG_API_BASE_URL && process.env.GIG_API_USERNAME && process.env.GIG_API_PASSWORD) {
    return gigCourier
  }
  return manualCourier
}
