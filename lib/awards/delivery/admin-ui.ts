import type { AdminDeliveryOrderView } from './types'

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g

function clean(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return null
  const result = value
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
  return result || null
}

/** Render only bounded, plain-text review metadata supplied to the staff queue. */
export function deliveryReviewReason(delivery: Pick<AdminDeliveryOrderView, 'reviewReason'>) {
  return clean(delivery.reviewReason, 1_000)
}

/** Keep an uncertain carrier waybill visibly separate from a confirmed waybill. */
export function deliveryRecoveryWaybill(delivery: Pick<AdminDeliveryOrderView, 'recoveryWaybill'>) {
  return clean(delivery.recoveryWaybill, 160)
}
