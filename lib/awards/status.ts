// lib/awards/status.ts
// The award order state machine. Transitions are enumerated rather than
// checked ad-hoc at call sites so that "never dispatch before paid" is a
// property of the type, not of whoever wrote the last route handler.

export type AwardStatus =
  | 'draft'
  | 'quoted'
  | 'quote_failed'
  | 'awaiting_payment'
  | 'paid'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'

const TRANSITIONS: Record<AwardStatus, readonly AwardStatus[]> = {
  // A member editing their address re-quotes, so quoted -> quoted is legal.
  draft: ['quoted', 'quote_failed', 'cancelled'],
  quoted: ['quoted', 'quote_failed', 'awaiting_payment', 'cancelled'],
  quote_failed: ['quoted', 'cancelled'],
  // Back to `quoted` when a checkout is abandoned or its quote expires.
  awaiting_payment: ['paid', 'quoted', 'cancelled'],
  paid: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'delivered', 'cancelled'],
  in_transit: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

/** Statuses at which the member's money has been taken. */
const PAID_STATUSES: readonly AwardStatus[] = ['paid', 'dispatched', 'in_transit', 'delivered']

export function canTransition(from: AwardStatus, to: AwardStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function assertTransition(from: AwardStatus, to: AwardStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal award order transition: ${from} -> ${to}`)
  }
}

export function isPaid(status: AwardStatus): boolean {
  return PAID_STATUSES.includes(status)
}

/**
 * Whether the compulsory-award prompt should still be shown. `null` means the
 * member has never started an order.
 */
export function needsClaim(status: AwardStatus | null): boolean {
  if (status === null) return true
  if (status === 'cancelled') return false
  return !isPaid(status)
}
