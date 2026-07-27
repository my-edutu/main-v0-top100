// lib/courier/index.ts
import { gigCourier } from './gig'
import { manualCourier } from './manual'
import type { CourierAdapter } from './types'

export * from './types'

/**
 * GIG when it is configured AND explicitly enabled, manual otherwise. Selection
 * is by env so a missing credential degrades to "admin quotes it by hand"
 * rather than to a crash mid-checkout.
 *
 * `GIG_ENABLED` is a deliberate second lock, not redundancy. The adapter's
 * field mapping is reconstructed from third-party clients, never from a vendor
 * document or a live call — and those sources disagree about which field holds
 * the shipping amount and whether GIG returns naira or kobo. The adapter
 * converts naira -> kobo (`* 100`), so if GIG in fact returns kobo, every
 * member is quoted 100x the real delivery cost and charged it.
 *
 * Without this flag, merely pasting the three credentials into .env silently
 * switches live members onto that unverified pricing. Requiring an explicit
 * opt-in means someone has to have read docs/gig-integration.md and completed
 * its first-call checklist. Manual pricing is slower; it cannot overcharge.
 */
export function getCourier(): CourierAdapter {
  const configured =
    process.env.GIG_API_BASE_URL && process.env.GIG_API_USERNAME && process.env.GIG_API_PASSWORD

  if (!configured) return manualCourier

  const enabled = String(process.env.GIG_ENABLED ?? '').toLowerCase()
  if (enabled !== 'true' && enabled !== '1') {
    console.warn(
      '[courier] GIG credentials are set but GIG_ENABLED is not "true" — using manual pricing. ' +
        'Verify the quote amount against GIG\'s own calculator first (see docs/gig-integration.md).',
    )
    return manualCourier
  }

  return gigCourier
}
