// app/api/admin/awards/verify-payment/route.ts
// Admin-only fallback for the case the signature-verified Paystack webhook
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

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const { orderId } = body ?? {}
  if (!orderId) return NextResponse.json({ message: 'orderId is required.' }, { status: 400 })

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

  if (!order.paystack_reference) {
    return NextResponse.json(
      { message: 'This order has no Paystack reference to verify — the member has never started checkout.' },
      { status: 400 },
    )
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
