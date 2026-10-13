import { bachsConfig } from '@/lib/payments/bachs/config'
import { verifyBachsAwardCheckout } from '@/lib/payments/bachs/settlement'
import type { BachsConfig } from '@/lib/payments/bachs/types'
import { notifyAwardPaymentConfirmed } from '@/lib/awards/payment-notify'
import type { BachsWebhookDb } from './bachs-webhook'
import { loadOrderForUser } from './server'

type ReconciliationAttempt = {
  id: string; order_id: string; provider: string; charge_scope: string; status: string
  currency: string; requested_amount_minor: number; provider_checkout_id: string | null; provider_reference: string
}

async function recoverCreatingAttempt(db: any, attempt: any): Promise<string> {
  const request = attempt.provider_response?.checkout_request
  if (attempt.status !== 'creating' || attempt.provider_checkout_id || !request?.body) return 'review_required'
  const { data: order, error } = await db.from('award_orders').select('profile_id').eq('id', attempt.order_id).maybeSingle()
  if (error || !order?.profile_id) throw new Error('Could not identify checkout owner.')
  const email = JSON.parse(request.body).customer?.email
  if (typeof email !== 'string' || (attempt.currency !== 'NGN' && attempt.currency !== 'USD')) return 'review_required'
  const { createAwardPaymentCheckout } = await import('./payment-server')
  try { await createAwardPaymentCheckout({ id: order.profile_id, email }, attempt.currency) }
  catch (error) {
    // A recovered expired/paid checkout updates state, then returns 409 rather
    // than sending the member back to an expired or already-paid payment page.
    if (!(error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 409)) throw error
  }
  return 'recovered'
}
export async function reconcileAwardAttempt(
  db: BachsWebhookDb, attempt: ReconciliationAttempt,
  options: { config?: BachsConfig; fetchProvider?: typeof fetch; notify?: typeof notifyAwardPaymentConfirmed } = {},
): Promise<{ outcome: string; notificationNeeded: boolean }> {
  if (attempt.provider !== 'bachs' || attempt.charge_scope !== 'award_fee' || !attempt.provider_checkout_id ||
      (attempt.currency !== 'NGN' && attempt.currency !== 'USD') ||
      !['creating', 'open', 'processing', 'overpaid'].includes(attempt.status)) return { outcome: 'review_required', notificationNeeded: false }
  const verified = await verifyBachsAwardCheckout({
    checkoutId: attempt.provider_checkout_id, reference: attempt.provider_reference,
    orderId: attempt.order_id, attemptId: attempt.id, currency: attempt.currency,
    requestedMinor: Number(attempt.requested_amount_minor),
  }, options.config ?? bachsConfig(), options.fetchProvider)
  if (!verified) return { outcome: 'review_required', notificationNeeded: false }
  const { data, error } = await db.rpc('reconcile_bachs_award_checkout', {
    p_attempt_id: attempt.id,
    p_checkout: {
      checkout_id: attempt.provider_checkout_id, reference: attempt.provider_reference,
      order_id: attempt.order_id, attempt_id: attempt.id,
      status: verified.status, currency: verified.currency, amount_minor: verified.amountMinor,
      charge_id: verified.chargeId, charge_currency: verified.chargeCurrency, gross_amount: verified.grossAmount,
    },
  })
  if (error) throw new Error('Could not record verified Bachs checkout state.')
  const result = data as { outcome?: string; notification_needed?: boolean } | null
  const notificationNeeded = result?.notification_needed === true
  if (notificationNeeded && result?.outcome === 'succeeded') {
    const { data: order } = await db.from('award_orders')
      .select('profile_id,recipient_name,email,award_payment_status,award_paid_at,award_paid_attempt_id')
      .eq('id', attempt.order_id).maybeSingle()
    if (order?.award_payment_status === 'paid' && order.award_paid_attempt_id === attempt.id) {
      await (options.notify ?? notifyAwardPaymentConfirmed)({
        orderId: attempt.order_id, profileId: order.profile_id, recipientName: order.recipient_name,
        email: order.email, currency: attempt.currency as 'NGN' | 'USD',
        amountMinor: Number(attempt.requested_amount_minor), paidAt: order.award_paid_at ?? new Date().toISOString(),
      }, { db })
    }
  }
  return { outcome: result?.outcome ?? 'review_required', notificationNeeded }
}

export async function reconcileMemberAwardPayment(db: any, userId: string): Promise<void> {
  const { order, error } = await loadOrderForUser(db, userId)
  if (error) throw new Error('Could not load award payment.')
  if (!order || ['paid', 'refunded'].includes(order.award_payment_status)) return
  const { data, error: attemptError } = await db.from('award_payment_attempts').select('*')
    .eq('order_id', order.id).eq('provider', 'bachs').eq('charge_scope', 'award_fee')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (attemptError) throw new Error('Could not load payment attempt.')
  if (data) {
    if (!data.provider_checkout_id) await recoverCreatingAttempt(db, data)
    else await reconcileAwardAttempt(db, data)
  }
}

/** For Dokploy cron and incident recovery; each mutation follows provider verification. */
export async function reconcilePendingAwardPayments(db: any, limit = 10) {
  const { data, error } = await db.from('award_payment_attempts').select('*')
    .eq('provider', 'bachs').eq('charge_scope', 'award_fee')
    .in('status', ['creating', 'open', 'processing', 'overpaid'])
    .lt('updated_at', new Date(Date.now() - 5 * 60_000).toISOString())
    .order('updated_at', { ascending: true }).limit(Math.min(50, Math.max(1, limit)))
  if (error) throw new Error('Could not load pending payment attempts.')
  const outcomes: Record<string, number> = {}
  for (const attempt of data ?? []) {
    try {
      const outcome = !attempt.provider_checkout_id ? await recoverCreatingAttempt(db, attempt) : (await reconcileAwardAttempt(db, attempt)).outcome
      outcomes[outcome] = (outcomes[outcome] ?? 0) + 1
      if (outcome === 'review_required') await db.from('award_payment_attempts').update({ updated_at: new Date().toISOString() }).eq('id', attempt.id).eq('status', attempt.status)
    } catch {
      outcomes.errors = (outcomes.errors ?? 0) + 1
      // Back off and let later attempts make progress during a provider outage.
      await db.from('award_payment_attempts').update({ updated_at: new Date().toISOString() }).eq('id', attempt.id).eq('status', attempt.status)
    }
  }
  return outcomes
}
