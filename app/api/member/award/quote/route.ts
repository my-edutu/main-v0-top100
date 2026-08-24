// app/api/member/award/quote/route.ts
// POST delivery details -> live shipping quote, stored server-side with an
// expiry. The response carries the itemised total the member is shown.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { awardPriceKobo, totalKobo } from '@/lib/awards/money'
import { quoteExpiresAt } from '@/lib/awards/quote'
import { getCourier, type QuoteResult } from '@/lib/courier'
import {
  AWARD_SETUP_MESSAGE,
  isMissingAwardTable,
  loadOrderForUser,
  mapAwardOrder,
} from '@/lib/awards/server'

export const runtime = 'nodejs'

const deliverySchema = z.object({
  recipientName: z.string().trim().min(2, 'Enter the full name for delivery.').max(120),
  phone: z.string().trim().min(7, 'Enter a reachable phone number.').max(32),
  email: z.string().trim().email('Enter a valid email address.').max(200),
  addressLine1: z.string().trim().min(4, 'Enter your street address.').max(200),
  addressLine2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(2, 'Enter your city.').max(100),
  state: z.string().trim().min(2, 'Enter your state or region.').max(100),
  country: z.string().trim().min(2, 'Enter your country.').max(100),
  postalCode: z.string().trim().max(32).optional().default(''),
})

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  // Quoting hits an external carrier API — rate limit per member, not per IP,
  // so one member on a shared network cannot lock out another.
  const rate = await checkRateLimit({ ...RATE_LIMITS.QUERY, identifier: `award-quote:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many quote requests. Please wait a moment.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = deliverySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Check your delivery details.' },
      { status: 400 },
    )
  }
  const details = parsed.data

  const supabase = createAdminClient()
  const { order: existing, error: loadError } = await loadOrderForUser(supabase, user.id)

  if (loadError) {
    if (isMissingAwardTable(loadError)) {
      return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not load your award order.' }, { status: 500 })
  }

  // A paid order's address is locked — it is already with the courier.
  if (existing && ['paid', 'dispatched', 'in_transit', 'delivered'].includes(existing.status)) {
    return NextResponse.json(
      { message: 'Your award is already paid for. Contact the admin team to change the delivery address.' },
      { status: 409 },
    )
  }

  // A live Paystack session is open for this order. Re-quoting here would
  // write `quoted` or `quote_failed` over `awaiting_payment` — and if the
  // member then pays that open session, the webhook's
  // canTransition('quote_failed', 'paid') is false, so the charge is captured
  // but the order can never legally reach `paid` again short of direct SQL.
  // The dashboard's totals panel now offers a Pay button at `awaiting_payment`
  // (see app/dashboard/awards-section.tsx), so nobody is stranded waiting to
  // re-quote — they can finish or abandon the payment first.
  if (existing && existing.status === 'awaiting_payment') {
    return NextResponse.json(
      {
        message:
          'Finish or cancel your current payment before editing your delivery address. Return to the totals panel to pay, or contact the admin team to cancel it.',
      },
      { status: 409 },
    )
  }

  let quote: QuoteResult
  try {
    quote = await getCourier().quote(details)
  } catch (error) {
    console.error('[award-quote] courier quote threw:', error)
    quote = { ok: false, reason: 'Our team will contact you about delivery.', raw: null }
  }
  const award = awardPriceKobo()

  const columns: Record<string, unknown> = {
    profile_id: user.id,
    recipient_name: details.recipientName,
    phone: details.phone,
    email: details.email,
    address_line1: details.addressLine1,
    address_line2: details.addressLine2 || null,
    city: details.city,
    state: details.state,
    country: details.country,
    postal_code: details.postalCode || null,
    award_amount_kobo: award,
    gig_response: quote.raw ?? null,
  }

  if (quote.ok) {
    columns.status = 'quoted'
    columns.shipping_amount_kobo = quote.shippingKobo
    columns.total_amount_kobo = totalKobo(award, quote.shippingKobo)
    columns.gig_quote = quote.raw ?? null
    columns.gig_quote_expires_at = quoteExpiresAt()
  } else {
    // No usable quote: park the order for the admin team rather than guessing
    // a shipping price the member would then be charged.
    columns.status = 'quote_failed'
    columns.shipping_amount_kobo = null
    columns.total_amount_kobo = null
    columns.gig_quote = null
    columns.gig_quote_expires_at = null
  }

  let saved: any = null
  let saveError: { code?: string; message?: string } | null = null

  if (existing) {
    // Guard against the order having moved on (e.g. a webhook already marked
    // it paid) during the courier network call above. Only a row still at one
    // of these statuses may be overwritten — landing this write on a `paid`
    // order would revert its status and NULL both money columns while leaving
    // paid_at/paystack_reference behind, which erases the payment record
    // without erasing the evidence that would normally flag a duplicate
    // charge. Mirrors the `.in('status', [...])` pattern in checkout/route.ts.
    const { data: updatedRows, error } = await supabase
      .from('award_orders')
      .update(columns)
      .eq('id', existing.id)
      .eq('profile_id', user.id)
      .in('status', ['draft', 'quoted', 'quote_failed', 'awaiting_payment'])
      .select('id')

    if (error) {
      saveError = error
    } else if (!updatedRows || updatedRows.length === 0) {
      // Zero rows matched is not success — the order changed status under us.
      return NextResponse.json(
        { message: 'Your order changed while you were editing it. Please reload the page and try again.' },
        { status: 409 },
      )
    } else {
      saved = { ...existing, ...columns }
    }
  } else {
    const { data, error } = await supabase.from('award_orders').insert(columns).select('*').single()
    saved = data
    saveError = error
  }

  if (saveError) {
    if (isMissingAwardTable(saveError)) {
      return NextResponse.json({ message: AWARD_SETUP_MESSAGE }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not save your delivery details.' }, { status: 500 })
  }

  return NextResponse.json({
    order: mapAwardOrder(saved),
    message: quote.ok ? null : quote.reason,
  })
}
