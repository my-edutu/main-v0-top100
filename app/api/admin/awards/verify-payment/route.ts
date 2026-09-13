// app/api/admin/awards/verify-payment/route.ts
// Admin-only fallback for the case the signature-verified legacy Paystack webhook
// never arrives at all — most commonly because the webhook URL is
// misconfigured in the Paystack dashboard, which cannot be verified from this
// environment. Without this route, money captured in that scenario has zero
// record anywhere on the order, and the "paid, no waybill" queue in
// /admin/awards (the only other recovery surface) never sees it, because the
// order was never marked paid in the first place.
//
// This is NOT the `status: 'paid'` fabrication hole that
// app/api/admin/awards/route.ts deliberately closed. That route refuses
// `paid` because an admin typing it in by hand has no evidence a charge ever
// happened. This route only ever writes `paid` after asking Paystack's own
// API — via verifyTransaction() — to confirm the charge succeeded and covers
// the order's total. That is exactly the evidence the webhook itself relies
// on, just fetched on demand instead of pushed by Paystack, so it cannot be
// used to fabricate a payment.
//
// Deliberately does not book a shipment: dispatch stays owned by the webhook
// (and the existing manual-waybill admin action for when courier booking
// fails), so there remains exactly one automatic book() call site.
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { paidAmountMatches, verifyTransaction } from '@/lib/payments/paystack'
import { canTransition, type AwardStatus } from '@/lib/awards/status'
import { mapAwardOrder } from '@/lib/awards/server'

export const runtime = 'nodejs'

function isMissingPaymentAttemptTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*award_payment_attempts.* does not exist|schema cache/i.test(error.message ?? '')
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const { orderId, attemptId, provider } = body ?? {}
  if (!orderId) return NextResponse.json({ message: 'orderId is required.' }, { status: 400 })

  // This endpoint is a temporary recovery path for historical Paystack
  // references. A Bachs attempt is confirmed only by its signed webhook; it
  // must never be routed through the old Paystack verifier.
  if (provider && provider !== 'paystack') {
    return NextResponse.json(
      { message: 'Only historical Paystack payments can use this verification endpoint.' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: order, error: lookupError } = await supabase
    .from('award_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (lookupError) {
    console.error('[admin-awards-verify] Failed to look up award order:', lookupError)
    return NextResponse.json({ message: 'Could not look up this order.' }, { status: 500 })
  }
  if (!order) return NextResponse.json({ message: 'Award order not found.' }, { status: 404 })

  if (order.award_payment_status === 'paid' || order.award_paid_attempt_id) {
    return NextResponse.json(
      { message: 'This order has already been recorded as paid by the award payment flow.' },
      { status: 409 },
    )
  }

  // The summary guard above is the normal path. Also inspect the attempt
  // ledger when available so a partially updated order cannot be confirmed
  // through this legacy route after a Bachs success was already recorded.
  let paymentAttempts: any[] = []
  try {
    const attemptsResult = await supabase
      .from('award_payment_attempts')
      .select('id, provider, status, charge_scope, provider_reference')
      .eq('order_id', orderId)

    if (attemptsResult.error) {
      if (!isMissingPaymentAttemptTable(attemptsResult.error)) {
        console.error('[admin-awards-verify] Failed to inspect payment attempts:', attemptsResult.error)
        return NextResponse.json({ message: 'Could not validate this payment.' }, { status: 500 })
      }
    } else {
      paymentAttempts = (attemptsResult.data ?? []) as any[]
    }
  } catch {
    // A pre-cutover deployment may not have the additive attempt table yet.
    // The stored Paystack reference remains the only historical evidence in
    // that state, so the legacy recovery path can continue safely.
  }

  if (paymentAttempts.some((attempt) => attempt.provider === 'bachs' && ['succeeded', 'duplicate_succeeded'].includes(attempt.status))) {
    return NextResponse.json(
      { message: 'This order has a recorded Bachs payment and cannot be verified with Paystack.' },
      { status: 409 },
    )
  }

  if (!order.paystack_reference) {
    return NextResponse.json(
      { message: 'This order has no Paystack reference to verify — the member has never started checkout.' },
      { status: 400 },
    )
  }

  if (attemptId) {
    const attempt = paymentAttempts.find((candidate) => candidate.id === attemptId)

    if (!attempt || attempt.provider !== 'paystack' || attempt.charge_scope !== 'legacy_award_plus_delivery') {
      return NextResponse.json(
        { message: 'Only a historical Paystack award attempt can be verified here.' },
        { status: 400 },
      )
    }

    // Never let a caller provide a provider reference that differs from the
    // reference already stored on the legacy order.
    if (attempt.provider_reference && attempt.provider_reference !== order.paystack_reference) {
      return NextResponse.json(
        { message: 'The requested Paystack attempt does not match this order.' },
        { status: 400 },
      )
    }
  }

  let verification: { status: string; amountKobo: number }
  try {
    verification = await verifyTransaction(order.paystack_reference)
  } catch (verifyError) {
    console.error('[admin-awards-verify] Paystack verification call failed:', verifyError)
    return NextResponse.json(
      {
        message:
          verifyError instanceof Error ? verifyError.message : 'Could not reach Paystack to verify this payment.',
      },
      { status: 502 },
    )
  }

  // Only proceed if Paystack itself reports the charge succeeded and the
  // amount covers what this order was priced at. Anything else changes
  // nothing on the order.
  const confirmed =
    verification.status === 'success' &&
    paidAmountMatches(verification.amountKobo, order.total_amount_kobo ?? Number.MAX_SAFE_INTEGER)

  if (!confirmed) {
    return NextResponse.json({
      confirmed: false,
      message:
        `Paystack does not confirm this payment (status: "${verification.status}", amount: ${verification.amountKobo} kobo). ` +
        'Nothing was changed.',
    })
  }

  // Guarded exactly like the webhook's own paid write: refuse a transition
  // the state machine does not allow (e.g. the order already moved on to
  // cancelled, or was already paid by the webhook in the meantime).
  if (!canTransition(order.status as AwardStatus, 'paid')) {
    return NextResponse.json(
      { message: `This order is "${order.status}" and can no longer be marked paid.` },
      { status: 409 },
    )
  }

  const stamped =
    `[${new Date().toISOString()}] Payment confirmed manually via the Paystack API (admin verification action). ` +
    `Reference ${order.paystack_reference}, Paystack status "${verification.status}", amount ${verification.amountKobo} kobo.`
  const nextNote =
    typeof order.admin_note === 'string' && order.admin_note.trim()
      ? `${order.admin_note}\n${stamped}`
      : stamped

  // The `.eq('status', order.status)` predicate makes this race-safe against
  // a webhook delivery landing at the same moment — only one of the two
  // writes can match, so this can never overwrite an order that has already
  // moved on.
  const { data: updated, error: updateError } = await supabase
    .from('award_orders')
    .update({
      status: 'paid',
      paystack_status: 'success',
      paid_at: new Date().toISOString(),
      admin_note: nextNote,
    })
    .eq('id', orderId)
    .eq('status', order.status)
    .select('*')
    .maybeSingle()

  if (updateError) {
    console.error('[admin-awards-verify] Failed to write paid status after Paystack confirmation:', updateError)
    return NextResponse.json(
      { message: 'Paystack confirmed this payment, but saving it failed. Try again.' },
      { status: 500 },
    )
  }

  if (!updated) {
    // Another request — most likely the webhook itself — already moved this
    // order's status out from under the guard above.
    return NextResponse.json(
      { message: 'This order changed status while verifying. Reload and check its current state before retrying.' },
      { status: 409 },
    )
  }

  return NextResponse.json({
    confirmed: true,
    message: 'Payment confirmed with Paystack. Order marked paid.',
    order: mapAwardOrder(updated),
  })
}
