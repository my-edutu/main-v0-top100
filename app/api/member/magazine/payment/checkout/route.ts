import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentUser } from '@/lib/auth-server'
import { isMagazineCheckoutEnabled } from '@/lib/production-readiness'
import { createMagazineFeatureCheckout, MagazinePaymentError } from '@/lib/magazine/payment-server'
import { normalizeMagazineCountryCode } from '@/lib/magazine/billing-country'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const checkoutDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(320),
  countryCode: z.string().trim().length(2, 'Select a valid country.'),
}).strict()

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  if (!isMagazineCheckoutEnabled(process.env)) return NextResponse.json({ message: 'Magazine payment is temporarily unavailable.' }, { status: 503 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `magazine-payment:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many payment attempts. Please wait a moment.')
  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ message: 'Invalid checkout details.' }, { status: 400 }) }
  const parsed = checkoutDetailsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Check your checkout details.' }, { status: 400 })
  }
  let details
  try { details = { ...parsed.data, countryCode: normalizeMagazineCountryCode(parsed.data.countryCode) } }
  catch { return NextResponse.json({ message: 'Select a valid country.' }, { status: 400 }) }
  try {
    return NextResponse.json(await createMagazineFeatureCheckout({ id: user.id }, details))
  } catch (error) {
    if (error instanceof MagazinePaymentError) return NextResponse.json({ message: error.message }, { status: error.statusCode })
    console.error('[magazine-payment] Checkout could not be completed.')
    return NextResponse.json({ message: 'Could not start payment. Please check the payment status before retrying.' }, { status: 502 })
  }
}
