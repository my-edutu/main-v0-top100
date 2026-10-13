import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { getAwardPaymentView } from '@/lib/awards/payment-server'
import { reconcileMemberAwardPayment } from '@/lib/awards/payment-reconciliation'
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit'
import { isAwardCheckoutEnabled } from '@/lib/production-readiness'

export const runtime = 'nodejs'
export async function POST() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `award-reconcile:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Please wait a moment before checking again.')
  try {
    await reconcileMemberAwardPayment(createAdminClient(), user.id)
    return NextResponse.json({ ...await getAwardPaymentView(user.id), checkoutEnabled: isAwardCheckoutEnabled(process.env) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ message: 'Payment verification is temporarily unavailable. Please check again shortly before retrying payment.' }, { status: 503 })
  }
}
