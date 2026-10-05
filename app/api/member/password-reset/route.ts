import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import { createPasswordRecoveryClient } from '@/lib/supabase/password-recovery-client'
import { getRecoveryRedirectUrl, getRecoveryRequestOrigin } from '@/lib/auth/password-recovery'
import { SITE_URL } from '@/lib/site'

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return NextResponse.json({ message: 'Invalid request origin.' }, { status: 403 })
  }
  const user = await getCurrentUser()
  if (!user?.id || !user.email) {
    return NextResponse.json({ message: 'Sign in to reset your password.' }, { status: 401 })
  }
  const rate = await checkRateLimit({ identifier: `member-password-reset:${user.id}`, maxRequests: 3, windowSeconds: 15 * 60 })
  if (!rate.success) return createRateLimitResponse(rate, 'Please wait before requesting another reset email.')
  try {
    const origin = getRecoveryRequestOrigin({ browserOrigin: request.nextUrl.origin, canonicalSiteUrl: SITE_URL, isProduction: process.env.NODE_ENV === 'production' })
    // The recipient comes only from the verified session; request data is never used.
    const { error } = await createPasswordRecoveryClient({ fetch: globalThis.fetch }).auth.resetPasswordForEmail(user.email, {
      redirectTo: getRecoveryRedirectUrl(origin, 'member'),
    })
    if (error) {
      console.error('[password-reset] recovery request failed', { userId: user.id, code: error.code, status: error.status })
      return NextResponse.json({ message: 'Could not send the reset email. Please try again shortly.' }, { status: error.status === 429 ? 429 : 503 })
    }
    return NextResponse.json({ message: 'A password reset link has been sent to your account email.' })
  } catch {
    return NextResponse.json({ message: 'Could not send the reset email. Please try again shortly.' }, { status: 503 })
  }
}
