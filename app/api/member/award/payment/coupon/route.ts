import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { isAwardCheckoutEnabled } from '@/lib/production-readiness'
import { checkRateLimit, createRateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'
import { awardCouponCodeSchema, awardCouponDigest, awardCouponUnavailable, DEFAULT_AWARD_COUPON_DIGEST } from '@/lib/awards/coupon-server'
import { AwardPaymentError } from '@/lib/awards/payment-errors'
import { getAwardPaymentView } from '@/lib/awards/payment-server'
import { AWARD_COUPON_QUOTE } from '@/lib/awards/payment-price'

export const runtime = 'nodejs'

const bodySchema = z.union([
  z.object({ code: awardCouponCodeSchema }).strict(),
  z.object({ useDefaultCoupon: z.literal(true) }).strict(),
])
const privateHeaders = { 'Cache-Control': 'private, no-store' }

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
    const manualCode = 'code' in parsed.data ? parsed.data.code : null
    const { data, error } = await createAdminClient().rpc('preview_award_coupon', {
      p_profile_id: user.id,
      p_code_digest: manualCode ? awardCouponDigest(manualCode) : DEFAULT_AWARD_COUPON_DIGEST,
    })
    if (error) throw error
    if (!data) {
      if (!manualCode) return NextResponse.json(null, { headers: privateHeaders })
      throw awardCouponUnavailable()
    }
    const view = await getAwardPaymentView(user.id)
    if (!view.needsPayment || view.status === 'refunded') throw awardCouponUnavailable()
    if (view.status === 'pending' && !view.currentAttempt) {
      throw new AwardPaymentError(409, 'An earlier payment needs confirmation. Check your payment status before applying a coupon.')
    }
    if (view.currentAttempt && ['open', 'creating', 'processing', 'underpaid', 'overpaid', 'exception'].includes(view.currentAttempt.status)) {
      throw new AwardPaymentError(409, 'You already have a payment attempt. Check its status before applying a coupon.')
    }
    return NextResponse.json(AWARD_COUPON_QUOTE, { headers: privateHeaders })
  } catch (error) {
    if (error instanceof AwardPaymentError) {
      return NextResponse.json({ message: error.message }, { status: error.statusCode })
    }
    return NextResponse.json({ message: 'Could not check the coupon. Please try again.' }, { status: 503 })
  }
}
