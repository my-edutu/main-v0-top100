import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { isAwardCheckoutEnabled } from '@/lib/production-readiness'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { AwardPaymentError } from '@/lib/awards/payment-errors'
import { createAwardPaymentCheckout } from '@/lib/awards/payment-server'
import { normalizeMagazineCountryCode } from '@/lib/magazine/billing-country'

export const runtime = 'nodejs'

const checkoutDetailsSchema = z.object({
  countryCode: z.string().trim().length(2, 'Select a valid country.'),
  email: z.string().trim().email('Enter a valid email address.').max(320, 'Enter a valid email address.'),
}).strict()

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  if (!isAwardCheckoutEnabled(process.env)) {
    return NextResponse.json({ message: 'Award payment is temporarily unavailable. Please check back soon.' }, { status: 503 })
  }
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `award-payment:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many payment attempts. Please wait a moment.')

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ message: 'Enter your billing country and a valid email address.' }, { status: 400 })
  }
  const parsed = checkoutDetailsSchema.safeParse(rawBody)
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? 'Check your billing details.' }, { status: 400 })
  let countryCode: string
  try {
    countryCode = normalizeMagazineCountryCode(parsed.data.countryCode)
  } catch {
    return NextResponse.json({ message: 'Select a valid country.' }, { status: 400 })
  }
  try {
    return NextResponse.json(await createAwardPaymentCheckout(user, 'USD', parsed.data.email.trim().toLowerCase(), countryCode))
  } catch (error) {
    if (error instanceof AwardPaymentError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode })
    }
    // Provider messages can include request/credential material; keep them out of logs and responses.
    console.error('[award-payment] Checkout could not be completed.')
    return NextResponse.json({ message: 'Could not start payment. Please refresh your award page before trying again.' }, { status: 502 })
  }
}
