'use client'

import { inject, track } from '@vercel/analytics'
import { AWARD_POPUP_CAMPAIGN, AWARD_POPUP_VARIANTS } from './popup'
import type { AwardPaymentCurrency, AwardPaymentView } from './payment'

type FunnelStage = 'popup_viewed' | 'reserve_clicked' | 'checkout_started' | 'payment_confirmed_viewed'
const attributionKey = (memberId: string) => `${AWARD_POPUP_CAMPAIGN}:attribution:${memberId}`

export function initializeAwardFunnel() {
  if (process.env.NODE_ENV !== 'production') return
  inject({ disableAutoTrack: true, beforeSend: event => ({ ...event, url: event.url.split('?')[0] }) })
}

/** Keep account identifiers in local storage only; analytics gets aggregate stages and design IDs. */
export function trackAwardFunnel(memberId: string, stage: FunnelStage, variant?: string, currency?: AwardPaymentCurrency) {
  try {
    if (variant) localStorage.setItem(attributionKey(memberId), variant)
    const design = variant ?? localStorage.getItem(attributionKey(memberId))
    if (!AWARD_POPUP_VARIANTS.some(item => item.id === design)) return
    const detail = { campaign: AWARD_POPUP_CAMPAIGN, stage, design, ...(currency ? { currency } : {}) }
    window.dispatchEvent(new CustomEvent('top100:award-funnel', { detail }))
    if (process.env.NODE_ENV === 'production') track('award_reservation_funnel', detail)
  } catch {
    // Measurement must never block dismissal, checkout, or payment confirmation.
  }
}

export function trackConfirmedAwardPayment(memberId: string, view: AwardPaymentView) {
  const payment = view.confirmedPayment
  if (view.status !== 'paid' || !payment) return
  try {
    if (!localStorage.getItem(attributionKey(memberId))) return
    const key = `${AWARD_POPUP_CAMPAIGN}:confirmed:${memberId}:${payment.currency}:${payment.paidAt}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, 'true')
    trackAwardFunnel(memberId, 'payment_confirmed_viewed', undefined, payment.currency)
  } catch {
    // Confirmation is controlled by the server, independently of analytics.
  }
}
