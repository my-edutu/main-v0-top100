import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { getAwardPaymentView } from '@/lib/awards/payment-server'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { getCourier } from '@/lib/courier'
import { isNigeria, nigeriaState } from '@/lib/awards/locations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const quoteSchema = z.object({
  deliveryMode: z.enum(['home', 'service_centre']).default('home'),
  addressLine1: z.string().trim().min(4, 'Enter a street address.').max(200),
  addressLine2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(2, 'Enter your city or town.').max(100),
  state: z.string().trim().min(2, 'Select your state.').max(100),
  country: z.string().trim().min(2).max(100).default('Nigeria'),
  postalCode: z.string().trim().max(32).optional().default(''),
  serviceCentreId: z.coerce.number().int().positive().optional(),
})

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

  const parsed = quoteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? 'Check your delivery details.' },
      { status: 400 },
    )
  }

  const details = parsed.data
  if (!isNigeria(details.country)) {
    return NextResponse.json({ message: 'Live GIG quotes are currently available for Nigerian destinations.' }, { status: 400 })
  }
  const state = nigeriaState(details.state)
  if (!state) return NextResponse.json({ message: 'Select a valid Nigerian state or FCT.' }, { status: 400 })

  if (details.deliveryMode === 'service_centre' && !details.serviceCentreId) {
    return NextResponse.json({ message: 'Choose a GIG service centre first.' }, { status: 400 })
  }
  if (details.deliveryMode === 'home' && details.serviceCentreId) {
    return NextResponse.json({ message: 'Remove the service-centre selection for home delivery.' }, { status: 400 })
  }

  try {
    const payment = await getAwardPaymentView(user.id)
    if (payment.status !== 'paid' && !payment.confirmedPayment) {
      return NextResponse.json({ message: 'Complete the physical award payment before requesting a delivery quote.' }, { status: 403 })
    }
  } catch {
    return NextResponse.json({ message: 'Could not verify your award payment. Please try again shortly.' }, { status: 503 })
  }

  const courier = getCourier()
  if (courier.name !== 'gig') {
    return NextResponse.json({ message: 'Live delivery quotes are temporarily unavailable. Our team can help with pricing.' }, { status: 503 })
  }

  const quote = await courier.quote({
    recipientName: 'Award recipient',
    phone: '',
    addressLine1: details.addressLine1,
    addressLine2: details.addressLine2,
    city: details.city,
    state: state.name,
    country: 'Nigeria',
    postalCode: details.postalCode,
    deliveryMode: details.deliveryMode,
    ...(details.deliveryMode === 'service_centre' ? { serviceCentreId: details.serviceCentreId } : {}),
  })

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
