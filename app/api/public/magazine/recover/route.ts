import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/send'
import { getActiveMagazineCampaign } from '@/lib/magazine/payment-server'
import { createMagazineRecoveryToken, readMagazineRecoveryToken } from '@/lib/magazine/guest-recovery'
import { createMagazineGuestAccessToken, hashMagazineGuestAccessToken, MAGAZINE_GUEST_ACCESS_COOKIE, MAGAZINE_GUEST_ACCESS_MAX_AGE, MAGAZINE_GUEST_ACCESS_PATH } from '@/lib/magazine/guest-access'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'
const schema = z.union([
  z.object({ email: z.string().trim().email().max(320) }).strict(),
  z.object({ token: z.string().min(1).max(1024) }).strict(),
])
const headers = { 'Cache-Control': 'private, no-store' }

export async function POST(request: NextRequest) {
  const originFailure = rejectCrossOriginMutation(request)
  if (originFailure) return originFailure
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Enter the email you used for your application.' }, { status: 400, headers })
  const rate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `magazine-resume-ip:${getClientIdentifier(request.headers)}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Please wait a moment before trying again.')
  try {
    const db = createAdminClient()
    if ('token' in parsed.data) {
      const claim = readMagazineRecoveryToken(parsed.data.token)
      if (!claim) return NextResponse.json({ message: 'This link has expired. Request a new link below.' }, { status: 400, headers })
      const guestToken = createMagazineGuestAccessToken()
      // Matching the old hash makes the link single-use and prevents concurrent reuse.
      const { data, error } = await db.from('magazine_feature_orders')
        .update({ guest_access_token_hash: hashMagazineGuestAccessToken(guestToken) })
        .eq('id', claim.orderId).is('profile_id', null).eq('guest_access_token_hash', claim.accessHash).select('id')
      if (error) throw new Error('Could not resume application.')
      if (!data?.length) return NextResponse.json({ message: 'This link has already been used. Request a new link below.' }, { status: 400, headers })
      const response = NextResponse.json({ resumed: true }, { headers })
      response.cookies.set(MAGAZINE_GUEST_ACCESS_COOKIE, guestToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: MAGAZINE_GUEST_ACCESS_PATH, maxAge: MAGAZINE_GUEST_ACCESS_MAX_AGE })
      return response
    }
    const email = parsed.data.email.toLowerCase()
    const emailRate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `magazine-resume-email:${email}` })
    if (!emailRate.success) return createRateLimitResponse(emailRate, 'Please wait a moment before requesting another link.')
    const campaign = await getActiveMagazineCampaign()
    const { data: order, error } = await db.from('magazine_feature_orders').select('id,guest_access_token_hash')
      .is('profile_id', null).eq('campaign_id', campaign.id).eq('customer_email', email).maybeSingle()
    if (error) throw new Error('Could not find application.')
    if (order?.guest_access_token_hash) {
      const origin = new URL(process.env.TOP100_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '')
      if (origin.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('Invalid recovery origin.')
      const url = new URL('/magazine/feature', origin.origin)
      url.hash = `resume=${createMagazineRecoveryToken(order.id, order.guest_access_token_hash)}`
      const link = url.toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      const sent = await sendTransactionalEmail({ to: email, subject: 'Continue your Africa Future Leaders magazine application',
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#171717"><h1 style="font-size:24px">Continue your magazine application</h1><p style="font-size:16px;line-height:1.6">Use this private link to return to your application and payment status. You do not need to create an account.</p><a href="${link}" style="display:inline-block;background:#ff6900;color:#fff;padding:16px 24px;border-radius:8px;text-decoration:none">Continue my application</a><p style="font-size:14px;line-height:1.6">This link expires in 30 minutes and can be used once. If you did not request it, you can ignore this email.</p></div>`,
        text: `Continue your magazine application: ${url.toString()}\nThis private link expires in 30 minutes and can be used once. If you did not request it, ignore this email.`,
      })
      if (!sent.ok) throw new Error('Recovery email could not be delivered.')
    }
    return NextResponse.json({ message: 'If an application exists for this email, a private link is on its way. Check your inbox and spam folder.' }, { headers })
  } catch {
    return NextResponse.json({ message: 'We could not send or open your link right now. Please try again shortly.' }, { status: 503, headers })
  }
}
