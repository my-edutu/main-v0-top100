// app/api/admin/awards/route.ts
// Admin view of every award order, plus the manual overrides the team needs
// when an automated quote or dispatch fails.
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { totalKobo } from '@/lib/awards/money'
import { assertTransition, type AwardStatus } from '@/lib/awards/status'
import { quoteExpiresAt } from '@/lib/awards/quote'
import { AWARD_SETUP_MESSAGE, isMissingAwardTable, mapAwardOrder } from '@/lib/awards/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('award_orders')
    .select('*, profiles!award_orders_profile_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })

  if (error) {
    if (isMissingAwardTable(error)) return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    return NextResponse.json({ message: 'Could not load award orders.' }, { status: 500 })
  }

  return NextResponse.json({
    orders: (data ?? []).map((row: any) => ({
      ...mapAwardOrder(row),
      memberName: row.profiles?.full_name ?? row.recipient_name ?? 'Awardee',
      memberEmail: row.profiles?.email ?? row.email ?? '',
      // `mapAwardOrder` intentionally omits `admin_note` (it is a server-side
      // operational trail, not part of the member-facing order shape it also
      // backs). The admin console is the one consumer that must see it: the
      // webhook writes courier-booking failures and duplicate-charge warnings
      // here, and it is the only place those surface. Appended the same way
      // `memberName`/`memberEmail` already are above.
      adminNote: row.admin_note ?? null,
      // Also intentionally omitted from `mapAwardOrder` for the same reason —
      // it is what the admin console's "Verify payment with Paystack" action
      // (POST /api/admin/awards/verify-payment) needs to know whether an
      // unpaid order even has a Paystack transaction to check.
      paystackReference: row.paystack_reference ?? null,
    })),
  })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const { orderId, status, shippingAmountKobo, adminNote, waybill } = body ?? {}
  if (!orderId) return NextResponse.json({ message: 'orderId is required.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: order, error: lookupError } = await supabase
    .from('award_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (lookupError) {
    console.error('[admin-awards] Failed to look up award order:', lookupError)
    return NextResponse.json({ message: 'Could not look up this order.' }, { status: 500 })
  }
  if (!order) return NextResponse.json({ message: 'Award order not found.' }, { status: 404 })

  const columns: Record<string, unknown> = {}

  // Manual shipping price for a destination GIG could not quote. This puts the
  // order back at `quoted` so the member can pay the agreed amount.
  if (typeof shippingAmountKobo === 'number') {
    if (!Number.isInteger(shippingAmountKobo) || shippingAmountKobo < 0) {
      return NextResponse.json({ message: 'Shipping amount must be a whole number of kobo.' }, { status: 400 })
    }

    // The UI only shows this input at `quote_failed`, but the route is
    // reachable directly — without this check, overriding the shipping price
    // on a `paid` or `dispatched` order would revert it to `quoted` and
    // rewrite its total, re-opening checkout on an order the member already
    // paid for.
    try {
      assertTransition(order.status as AwardStatus, 'quoted')
    } catch (transitionError) {
      return NextResponse.json(
        { message: transitionError instanceof Error ? transitionError.message : 'Illegal status change.' },
        { status: 409 },
      )
    }

    columns.shipping_amount_kobo = shippingAmountKobo
    columns.total_amount_kobo = totalKobo(order.award_amount_kobo, shippingAmountKobo)
    columns.status = 'quoted'
    columns.gig_quote_expires_at = quoteExpiresAt()
  }

  if (typeof status === 'string') {
    // `paid` may only ever be set by the signature-verified Paystack webhook,
    // which also writes `paid_at`, `paystack_reference` and `paystack_status`
    // alongside it. This route only ever flips the `status` column, so
    // allowing `paid` here would let an admin fabricate a paid order — and,
    // transitively, a dispatch-eligible one — with no real charge behind it.
    if (status === 'paid') {
      return NextResponse.json(
        { message: 'Paid status is set only by the payment webhook and cannot be applied by hand.' },
        { status: 403 },
      )
    }

    try {
      assertTransition(order.status as AwardStatus, status as AwardStatus)
    } catch (transitionError) {
      return NextResponse.json(
        { message: transitionError instanceof Error ? transitionError.message : 'Illegal status change.' },
        { status: 409 },
      )
    }
    columns.status = status
  }

  if (typeof adminNote === 'string') columns.admin_note = adminNote
  if (typeof waybill === 'string') columns.gig_waybill = waybill

  if (Object.keys(columns).length === 0) {
    return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 })
  }

  const { data: updated, error } = await supabase
    .from('award_orders')
    .update(columns)
    .eq('id', orderId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ message: 'Could not update this order.' }, { status: 500 })

  return NextResponse.json({ order: mapAwardOrder(updated) })
}
