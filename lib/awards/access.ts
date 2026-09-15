import type { AwardPaymentView } from './payment'

export const AWARD_ACCESS_REDIRECT = '/dashboard/me/award?intro=continued'

export function awardAccessRedirect(view: AwardPaymentView | null): string | null {
  return view && (view.status === 'paid' || view.confirmedPayment)
    ? null
    : AWARD_ACCESS_REDIRECT
}
