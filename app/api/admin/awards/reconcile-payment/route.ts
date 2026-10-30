import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { reconcileAwardAttempt, RECONCILABLE_AWARD_STATUSES } from '@/lib/awards/payment-reconciliation'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const RECONCILABLE_STATUSES = RECONCILABLE_AWARD_STATUSES

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const { orderId, attemptId } = body && typeof body === 'object'
    ? body as { orderId?: unknown; attemptId?: unknown }
    : {}
  if (typeof orderId !== 'string' || typeof attemptId !== 'string') {
    return NextResponse.json({ message: 'orderId and attemptId are required.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: attempt, error } = await supabase
    .from('award_payment_attempts')
    .select('id, order_id, provider, charge_scope, status, currency, requested_amount_minor, provider_checkout_id, provider_reference')
    .eq('id', attemptId)
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) {
    console.error('[admin-awards-reconcile] Failed to load payment attempt:', error)
    return NextResponse.json({ message: 'Could not load this payment attempt.' }, { status: 503 })
  }
  if (!attempt) return NextResponse.json({ message: 'Payment attempt not found for this order.' }, { status: 404 })
  if (attempt.provider !== 'bachs' || attempt.charge_scope !== 'award_fee' ||
      !RECONCILABLE_STATUSES.includes(attempt.status) || !attempt.provider_checkout_id) {
    return NextResponse.json({ message: 'This Bachs checkout is not eligible for reconciliation.' }, { status: 409 })
  }

  try {
    const result = await reconcileAwardAttempt(supabase, attempt)
    const message = result.outcome === 'succeeded'
      ? 'Bachs confirmed this payment and the award ledger was updated.'
      : result.outcome === 'open'
        ? 'Bachs still reports this checkout as open. No payment status was changed.'
        : `Bachs did not provide enough matching evidence to update this payment (${result.outcome}).`
    return NextResponse.json({ ...result, message })
  } catch (reconcileError) {
    console.error('[admin-awards-reconcile] Provider verification failed:', reconcileError)
    return NextResponse.json(
      { message: 'Could not verify this checkout with Bachs. No payment status was changed.' },
      { status: 502 },
    )
  }
}
