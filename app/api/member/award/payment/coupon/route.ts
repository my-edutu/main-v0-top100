import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { isAwardCheckoutEnabled } from '@/lib/production-readiness'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { awardCouponCodeSchema, awardCouponDigest, awardCouponUnavailable } from '@/lib/awards/coupon-server'
import { AwardPaymentError } from '@/lib/awards/payment-errors'
import { getAwardPaymentView } from '@/lib/awards/payment-server'
import { AWARD_COUPON_DISCOUNT_MINOR, AWARD_COUPON_TOTAL_MINOR, DEFAULT_AWARD_FEE_NGN_MINOR } from '@/lib/awards/payment-price'
import type { AwardCouponQuote } from '@/lib/awards/payment'

export const runtime = 'nodejs'

const bodySchema = z.object({ code: awardCouponCodeSchema }).strict()

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  if (!isAwardCheckoutEnabled(process.env)) {
    return NextResponse.json({ message: 'Award payment is temporarily unavailable.' }, { status: 503 })
  }

  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `award-coupon:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many coupon attempts. Please wait a moment.')
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Enter a valid coupon code.' }, { status: 400 })

  try {
    const { data, error } = await createAdminClient().rpc('preview_award_coupon', {
      p_profile_id: user.id,
      p_code_digest: awardCouponDigest(parsed.data.code),
    })
    if (error) throw error
    if (!data) throw awardCouponUnavailable()
    const view = await getAwardPaymentView(user.id)
    if (!view.needsPayment || view.status === 'refunded') throw awardCouponUnavailable()
    if (view.status === 'pending' && !view.currentAttempt) {
      throw new AwardPaymentError(409, 'An earlier payment needs confirmation. Check your payment status before applying a coupon.')
    }
    if (view.currentAttempt && ['open', 'creating', 'processing', 'underpaid', 'overpaid', 'exception'].includes(view.currentAttempt.status)) {
      throw new AwardPaymentError(409, 'You already have a payment attempt. Check its status before applying a coupon.')
    }
    const quote: AwardCouponQuote = {
      currency: 'NGN',
      baseAmountMinor: DEFAULT_AWARD_FEE_NGN_MINOR,
      discountAmountMinor: AWARD_COUPON_DISCOUNT_MINOR,
      amountMinor: AWARD_COUPON_TOTAL_MINOR,
    }
    return NextResponse.json(quote, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    if (error instanceof AwardPaymentError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ message: 'Could not check the coupon. Please try again.' }, { status: 503 })
  }
}
