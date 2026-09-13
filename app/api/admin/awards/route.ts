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
import { isAwardMilestone, notifyAwardStatus } from '@/lib/awards/notify'
import {
  mapAdminPaymentAttempt,
  selectAdminPaymentAttempt,
} from '@/lib/awards/admin-payment-view'

export const runtime = 'nodejs'

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function isMissingPaymentAttemptTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*award_payment_attempts.* does not exist|schema cache/i.test(error.message ?? '')
}

const ADMIN_PAYMENT_ATTEMPT_COLUMNS = [
  'id',
  'order_id',
  'provider',
  'charge_scope',
  'status',
  'price_version',
  'requested_amount_minor',
  'captured_amount_minor',
  'currency',
  'provider_reference',
  'provider_checkout_id',
  'provider_charge_id',
  'provider_status',
  'confirmed_at',
  'failure_reason',
  'created_at',
].join(', ')

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

  const orderRows = data ?? []
  const attemptsByOrder = new Map<string, any[]>()
  const orderIds = orderRows.map((row: any) => row?.id).filter((id: unknown): id is string => typeof id === 'string')

  if (orderIds.length > 0) {
    try {
      const attemptsResult = await supabase
        .from('award_payment_attempts')
        .select(ADMIN_PAYMENT_ATTEMPT_COLUMNS)
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })

      if (attemptsResult.error) {
        // The additive migration may not have reached a deployment yet. Keep
        // historical Paystack rows visible while the rest of the admin page
        // continues to work against the existing award_orders table.
        if (!isMissingPaymentAttemptTable(attemptsResult.error)) {
          console.error('[admin-awards] Failed to load payment attempts:', attemptsResult.error)
        }
      } else {
        for (const attempt of (attemptsResult.data ?? []) as any[]) {
          const orderId = nullableString(attempt?.order_id)
          if (!orderId) continue
          const existing = attemptsByOrder.get(orderId) ?? []
          existing.push(attempt)
          attemptsByOrder.set(orderId, existing)
        }
      }
    } catch (attemptError) {
      // A partially deployed Supabase schema or a narrow test double should
      // not hide the order queue; legacy fallback mapping remains available.
      console.error('[admin-awards] Failed to load payment attempts:', attemptError)
    }
  }

  return NextResponse.json({
    orders: orderRows.map((row: any) => {
      const rawAttempts = attemptsByOrder.get(row.id) ?? []
      const payment = selectAdminPaymentAttempt(row, rawAttempts)
      const legacyPaid = Boolean(
        payment?.isLegacy &&
          ['paid', 'success', 'successful', 'succeeded', 'complete', 'completed', 'accepted'].includes(payment.status.toLowerCase()),
      ) || Boolean(row.status === 'paid' || row.paid_at)
      return {
        ...mapAwardOrder(row),
        memberName: row.profiles?.full_name ?? row.recipient_name ?? 'Awardee',
        memberEmail: row.profiles?.email ?? row.email ?? '',
        adminNote: row.admin_note ?? null,
        paystackReference: row.paystack_reference ?? null,
        awardPaymentStatus:
          nullableString(row.award_payment_status) ??
          (payment?.provider === 'bachs' ? payment.status : legacyPaid ? 'paid' : 'unpaid'),
        awardPaidAt: nullableString(row.award_paid_at) ?? (legacyPaid ? payment?.paidAt ?? nullableString(row.paid_at) : null),
        awardPaidAttemptId: nullableString(row.award_paid_attempt_id),
        awardPriceVersion: nullableString(row.award_price_version),
        payment,
        paymentAttempts: rawAttempts.length > 0
          ? rawAttempts.map(mapAdminPaymentAttempt)
          : payment
            ? [payment]
            : [],
      }
    }),
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

  // `updated`, never `order`: this PATCH also writes the waybill, and the
  // pre-update row would give the member a dispatch email with no waybill in
  // it. notifyAwardStatus never throws and sends once per (order, status).
  if (isAwardMilestone(columns.status)) await notifyAwardStatus(supabase, updated, columns.status as string)

  return NextResponse.json({ order: mapAwardOrder(updated) })
}
