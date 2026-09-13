import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { isAwardCheckoutEnabled } from '@/lib/production-readiness'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { parseCheckoutCurrency } from '@/lib/awards/payment-state'
import { AwardPaymentError } from '@/lib/awards/payment-errors'
import { createAwardPaymentCheckout } from '@/lib/awards/payment-server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  if (!isAwardCheckoutEnabled(process.env)) {
    return NextResponse.json({ message: 'Award payment is temporarily unavailable. Please check back soon.' }, { status: 503 })
  }
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `award-payment:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many payment attempts. Please wait a moment.')

  let currency
  try {
    currency = parseCheckoutCurrency(await request.json())
  } catch {
    return NextResponse.json({ message: 'Send only a supported currency (NGN or USD).' }, { status: 400 })
  }
  try {
    return NextResponse.json(await createAwardPaymentCheckout(user, currency))
  } catch (error) {
    if (error instanceof AwardPaymentError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode })
    }
    // Provider messages can include request/credential material; keep them out of logs and responses.
    console.error('[award-payment] Checkout could not be completed.')
    return NextResponse.json({ message: 'Could not start payment. Please refresh your award page before trying again.' }, { status: 502 })
  }
}
