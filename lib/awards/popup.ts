import type { AwardPaymentView } from './payment'

export const AWARD_POPUP_CAMPAIGN = 'afl-november-2026'
export const AWARD_POPUP_VARIANTS = [
  { id: 'achievement', title: 'Your Achievement Deserves a Physical Award.', description: 'You’ve earned your place among Africa Future Leaders 2026. Reserve an award to celebrate this milestone.' },
  { id: 'invitation', title: 'Your Moment Is Approaching.', description: 'Reserve your physical award ahead of the official presentation.' },
  { id: 'recognition', title: 'Celebrate Your Place in the 2026 Class.', description: 'Mark your leadership and impact with an official physical award.' },
  { id: 'celebration', title: 'Your Achievement Deserves to Be Celebrated.', description: 'Make your recognition tangible with your Africa Future Leaders physical award.' },
  { id: 'keepsake', title: 'A Milestone Worth Remembering.', description: 'Keep a lasting reminder of your leadership and the work that brought you here.' },
  { id: 'presentation', title: 'Your Recognition. Made Tangible.', description: 'Preserve this milestone with your official Africa Future Leaders physical award.' },
] as const

export type AwardPopupVariant = typeof AWARD_POPUP_VARIANTS[number]
export type AwardPopupVisit = { day: string; login: number; variant: number }

export function awardPopupStorageKey(memberId: string) {
  return `${AWARD_POPUP_CAMPAIGN}:visits:${memberId}`
}

export function awardPopupDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function readAwardPopupVisit(raw: string | null): AwardPopupVisit | null {
  try {
    const value = raw ? JSON.parse(raw) : null
    if (value && typeof value.day === 'string' && Number.isSafeInteger(value.login) && Number.isInteger(value.variant) && value.variant >= 0 && value.variant < AWARD_POPUP_VARIANTS.length) return value
  } catch { /* Ignore an old or malformed browser preference. */ }
  return null
}

/** One design per login; a later calendar day in the same session does not repeat it. */
export function nextAwardPopupVisit(previous: AwardPopupVisit | null, login: number, day: string, initialVariant = 0): AwardPopupVisit | null {
  if (previous?.login === login) return null
  return { day, login, variant: previous ? (previous.variant + 1) % AWARD_POPUP_VARIANTS.length : initialVariant % AWARD_POPUP_VARIANTS.length }
}

export function canOfferPhysicalAward(view: AwardPaymentView | null) {
  if (!view || !view.needsPayment || view.confirmedPayment || view.checkoutEnabled === false) return false
  if (view.status !== 'unpaid' && view.status !== 'failed') return false
  if (view.currentAttempt && !['failed', 'expired', 'cancelled'].includes(view.currentAttempt.status)) return false
  return view.priceOptions.length > 0
}
