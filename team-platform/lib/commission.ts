export type LedgerLike = {
  amount_minor: number
  currency: string
  status: 'pending' | 'confirmed'
  available_at: string
}

export type WithdrawalLike = {
  amount_minor: number
  settled_amount_minor?: number | null
  currency: string
  status: string
}

const RESERVING = new Set(['requested', 'under_review', 'approved', 'processing'])

/**
 * Mirrors public.team_agent_balance. Used for client previews and tests; the
 * SQL function is the only authority for withdrawals.
 */
export function calculateBalance(
  entries: LedgerLike[],
  withdrawals: WithdrawalLike[],
  currency = 'NGN',
  now = new Date(),
) {
  let confirmedEarned = 0
  let availableNow = 0
  let pendingCommission = 0

  for (const entry of entries) {
    if (entry.currency !== currency) continue
    const available = entry.status === 'confirmed' && new Date(entry.available_at) <= now
    if (entry.status === 'confirmed') confirmedEarned += entry.amount_minor
    if (available) availableNow += entry.amount_minor
    else pendingCommission += entry.amount_minor
  }

  let pendingWithdrawal = 0
  let withdrawn = 0
  for (const withdrawal of withdrawals) {
    if (withdrawal.currency !== currency) continue
    if (withdrawal.status === 'paid') {
      withdrawn += withdrawal.settled_amount_minor ?? withdrawal.amount_minor
    } else if (RESERVING.has(withdrawal.status)) {
      pendingWithdrawal += withdrawal.amount_minor
    }
  }

  return {
    currency,
    confirmed_earned_minor: confirmedEarned,
    available_balance_minor: availableNow - pendingWithdrawal - withdrawn,
    pending_commission_minor: pendingCommission,
    pending_withdrawal_minor: pendingWithdrawal,
    withdrawn_minor: withdrawn,
    total_earned_minor: confirmedEarned + pendingCommission,
    withdrawable_minor: Math.max(availableNow - pendingWithdrawal - withdrawn, 0),
  }
}

export function isCommissionEligible(payment: {
  status?: string | null
  verifiedAt?: string | null
  sourceId?: string | null
}) {
  return payment.status === 'paid' && Boolean(payment.verifiedAt) && Boolean(payment.sourceId)
}

export function uniqueCommissionKey(paymentType: string, paymentId: string) {
  return `${paymentType}:${paymentId}`
}
