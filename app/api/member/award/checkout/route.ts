// app/api/member/award/checkout/route.ts
// POST -> initialise a Paystack transaction for the member's stored quote.
// The charged amount comes from the database, never from the request body.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { assertKobo } from '@/lib/awards/money'
import { isQuoteExpired } from '@/lib/awards/quote'
import { assertTransition } from '@/lib/awards/status'
import { buildReference, initializeTransaction } from '@/lib/payments/paystack'
import { AWARD_SETUP_MESSAGE, isMissingAwardTable, loadOrderForUser } from '@/lib/awards/server'

export const runtime = 'nodejs'

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `award-checkout:${user.id}` })
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
    await supabase.from('award_orders').update({ status: 'quoted' }).eq('id', order.id)
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
  const attemptSuffix = Date.now().toString(36)
  const reference = buildReference(order.id, attemptSuffix)

  let init
  try {
    init = await initializeTransaction({
      email: order.email || user.email || '',
      amountKobo,
      reference,
      callbackUrl: `${siteOrigin(request)}/dashboard?section=awards&payment=done`,
      metadata: { orderId: order.id, profileId: user.id, purpose: 'africa-future-leaders-award' },
    })
  } catch (paymentError) {
    return NextResponse.json(
      { message: paymentError instanceof Error ? paymentError.message : 'Could not start the payment.' },
      { status: 502 },
    )
  }

  await supabase
    .from('award_orders')
    .update({ status: 'awaiting_payment', paystack_reference: init.reference, paystack_status: 'pending' })
    .eq('id', order.id)

  return NextResponse.json({ authorizationUrl: init.authorizationUrl, reference: init.reference })
}
