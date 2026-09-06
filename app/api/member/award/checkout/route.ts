// app/api/member/award/checkout/route.ts
// POST -> initialise a Paystack transaction for the member's stored quote.
// The charged amount comes from the database, never from the request body.
import crypto from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { assertKobo } from '@/lib/awards/money'
import { isQuoteExpired } from '@/lib/awards/quote'
import { awardReturnPath } from '@/lib/awards/return-url'
import { assertTransition } from '@/lib/awards/status'
import { buildReference, initializeTransaction } from '@/lib/payments/paystack'
import { isAwardCheckoutEnabled } from '@/lib/production-readiness'
import { AWARD_SETUP_MESSAGE, isMissingAwardTable, loadOrderForUser } from '@/lib/awards/server'

export const runtime = 'nodejs'

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  if (!isAwardCheckoutEnabled(process.env)) {
    return NextResponse.json(
      { message: 'Award payment is temporarily unavailable. Please check back soon.' },
      { status: 503 },
    )
  }

  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `award-checkout:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many payment attempts. Please wait a moment.')

  const supabase = createAdminClient()
  const { order, error } = await loadOrderForUser(supabase, user.id)

  if (error) {
    if (isMissingAwardTable(error)) return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    return NextResponse.json({ message: 'Could not load your award order.' }, { status: 500 })
  }
  if (!order) {
    return NextResponse.json({ message: 'Add your delivery details first.' }, { status: 400 })
  }
  if (order.status === 'quote_failed') {
    return NextResponse.json(
      { message: 'We could not price delivery to your address. Our team will contact you.' },
      { status: 409 },
    )
  }
  if (!['quoted', 'awaiting_payment'].includes(order.status)) {
    return NextResponse.json({ message: 'This award order is not ready for payment.' }, { status: 409 })
  }

  // A stale quote must be re-priced before it can be charged.
  if (isQuoteExpired(order.gig_quote_expires_at)) {
    // Guard against a concurrent webhook marking this order paid while this
    // request was in flight — only a row still at 'quoted' or
    // 'awaiting_payment' may be reset back to 'quoted'.
    const { error: resetError } = await supabase
      .from('award_orders')
      .update({ status: 'quoted' })
      .eq('id', order.id)
      .in('status', ['quoted', 'awaiting_payment'])
    if (resetError) {
      console.error('[award-checkout] failed to reset expired quote back to "quoted":', resetError)
    }
    return NextResponse.json(
      { message: 'Your delivery quote expired. Please confirm your address again to get a fresh price.', expired: true },
      { status: 409 },
    )
  }

  const amountKobo = order.total_amount_kobo
  if (typeof amountKobo !== 'number') {
    return NextResponse.json({ message: 'This award order has no price yet.' }, { status: 409 })
  }
  // Belt and braces: the DB is the source of truth, but a corrupted row must
  // not reach Paystack as a charge.
  assertKobo(amountKobo, 'order total')

  // Only assert the transition when the status is actually changing. An order
  // already at awaiting_payment is a legitimate retry (member abandoned the
  // payment page and clicked Pay again) — awaiting_payment -> awaiting_payment
  // is not a listed transition in lib/awards/status.ts, so asserting it here
  // unconditionally would throw on every retry.
  if (order.status !== 'awaiting_payment') {
    assertTransition(order.status, 'awaiting_payment')
  }

  // Paystack rejects re-initialising a reference that already exists, so a
  // deterministic AFL-AWARD-<orderId> reference would 502 every retry after
  // the first abandoned checkout. Suffix each attempt with something unique
  // so retries always get a fresh Paystack transaction, while the order id
  // stays recoverable as the reference's prefix. Do not "simplify" this back
  // to a bare buildReference(order.id) — see the webhook's fallback match on
  // metadata.orderId, which exists precisely because references churn here.
  const attemptSuffix = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`
  const reference = buildReference(order.id, attemptSuffix)

  let init
  try {
    init = await initializeTransaction({
      email: order.email || user.email || '',
      amountKobo,
      reference,
      callbackUrl: `${siteOrigin(request)}${awardReturnPath({ paymentDone: true })}`,
      metadata: { orderId: order.id, profileId: user.id, purpose: 'africa-future-leaders-award' },
    })
  } catch (paymentError) {
    // Never forward the raw error to the member — it can name unset env vars
    // (e.g. "PAYSTACK_SECRET_KEY is not configured") on a misconfigured
    // deployment. Log the detail server-side and return a generic message.
    console.error('[award-checkout] paystack initializeTransaction failed:', paymentError)
    return NextResponse.json({ message: 'Could not start the payment. Please try again.' }, { status: 502 })
  }

  // Guard against the order having moved on (e.g. a concurrent request's
  // update already landed, or a webhook already marked it paid) between the
  // read above and this write. Only a row still at 'quoted' or
  // 'awaiting_payment' may be dragged into 'awaiting_payment' here — a paid
  // order must never be reverted by a slower, racing checkout request.
  const { data: updatedRows, error: updateError } = await supabase
    .from('award_orders')
    .update({ status: 'awaiting_payment', paystack_reference: init.reference, paystack_status: 'pending' })
    .eq('id', order.id)
    .in('status', ['quoted', 'awaiting_payment'])
    .select('id')

  if (updateError || !updatedRows || updatedRows.length === 0) {
    // At this point Paystack has already issued a transaction, but we could
    // not record its reference against the order. The member has not been
    // given the checkout URL yet, so failing here is safe and recoverable —
    // returning it would let them pay into a reference we never persisted.
    console.error(
      '[award-checkout] failed to record paystack reference after init:',
      updateError ?? 'no row matched (order status changed concurrently)',
    )
    return NextResponse.json(
      { message: 'Could not start the payment. Please try again.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ authorizationUrl: init.authorizationUrl, reference: init.reference })
}
