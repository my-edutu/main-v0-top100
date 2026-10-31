import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { getCourier } from '@/lib/courier'
import { isNigeria } from '@/lib/awards/locations'
import { deliveryPreviewSchema } from '@/lib/awards/delivery-preview'
import { quoteGigInternationalDelivery } from '@/lib/courier/gig-international'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rate = await checkRateLimit({
    ...RATE_LIMITS.QUERY,
    identifier: `award-delivery-preview:${user.id}`,
  })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many quote requests. Please wait a moment.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = deliveryPreviewSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Check your delivery details.' },
      { status: 400 },
    )
  }

  const details = parsed.data
  if (!isNigeria(details.country)) {
    const result = await quoteGigInternationalDelivery(details)
    return result.ok
      ? NextResponse.json({ quote: result.quote }, { headers: { 'Cache-Control': 'private, no-store' } })
      : NextResponse.json({ message: result.message, code: result.code }, { status: result.status, headers: { 'Cache-Control': 'private, no-store' } })
  }

  // A read-only price preview: no award order, payment or saved address is required.
  const courier = getCourier()
  if (courier.name !== 'gig') {
    return NextResponse.json({ message: 'Live delivery quotes are temporarily unavailable. Our team can help with pricing.' }, { status: 503 })
  }

  let quote
  try {
    quote = await courier.quote({
      recipientName: 'Award recipient',
      phone: '',
      addressLine1: details.addressLine1,
      addressLine2: details.addressLine2,
      city: details.city,
      state: details.state,
      country: 'Nigeria',
      postalCode: details.postalCode,
      deliveryMode: details.deliveryMode,
      ...(details.deliveryMode === 'service_centre' ? { serviceCentreId: details.serviceCentreId } : {}),
    })
  } catch {
    return NextResponse.json({ message: 'GIG delivery pricing is temporarily unavailable. Please try again shortly.' }, { status: 502 })
  }

  if (!quote.ok) {
    return NextResponse.json(
      { message: quote.reason, code: quote.code ?? 'quote_failed' },
      { status: quote.code === 'carrier_error' ? 502 : 422 },
    )
  }

  return NextResponse.json({
    quote: {
      amountMinor: quote.shippingKobo,
      currency: quote.currency ?? 'NGN',
      deliveryMode: quote.delivery.mode,
      destination: quote.delivery.formattedAddress,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
