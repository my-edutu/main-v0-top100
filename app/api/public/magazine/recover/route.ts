import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/send'
import { getActiveMagazineCampaign } from '@/lib/magazine/payment-server'
import { createMagazineRecoveryToken, readMagazineRecoveryToken, createMagazineOtpCode, createMagazineOtpChallenge, readMagazineOtpChallenge, magazineOtpMatches, MAGAZINE_OTP_COOKIE, MAGAZINE_OTP_MAX_AGE } from '@/lib/magazine/guest-recovery'
import { createMagazineGuestAccessToken, hashMagazineGuestAccessToken, MAGAZINE_GUEST_ACCESS_COOKIE, MAGAZINE_GUEST_ACCESS_MAX_AGE, MAGAZINE_GUEST_ACCESS_PATH } from '@/lib/magazine/guest-access'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'

export const runtime = 'nodejs'
const schema = z.union([
  z.object({ email: z.string().trim().email().max(320) }).strict(),
  z.object({ token: z.string().min(1).max(1024) }).strict(),
  z.object({ code: z.string().regex(/^[0-9]{6}$/) }).strict(),
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
    if ('token' in parsed.data || 'code' in parsed.data) {
      let recoveryToken: string | null
      if ('code' in parsed.data) {
        const challenge = readMagazineOtpChallenge(request.cookies.get(MAGAZINE_OTP_COOKIE)?.value)
        if (!challenge) return NextResponse.json({ message: 'Your code has expired. Request a new code.' }, { status: 400, headers })
        // The email limit survives resends and applies across IPs and browsers.
        const verificationRate = await checkRateLimit({ maxRequests: 5, windowSeconds: 600, identifier: `magazine-otp-verify:${challenge.email}` })
        if (!verificationRate.success) return createRateLimitResponse(verificationRate, 'Too many attempts. Please wait before trying again.')
        if (!magazineOtpMatches(challenge, parsed.data.code) || !challenge.recoveryToken) return NextResponse.json({ message: 'That code could not be verified. Check your email and try again.' }, { status: 400, headers })
        recoveryToken = challenge.recoveryToken
      } else { recoveryToken = parsed.data.token }
      const claim = readMagazineRecoveryToken(recoveryToken)
      if (!claim) return NextResponse.json({ message: 'This link has expired. Request a new link below.' }, { status: 400, headers })
      const guestToken = createMagazineGuestAccessToken()
      // Matching the old hash makes the link single-use and prevents concurrent reuse.
      const { data, error } = await db.from('magazine_feature_orders')
        .update({ guest_access_token_hash: hashMagazineGuestAccessToken(guestToken) })
        .eq('id', claim.orderId).is('profile_id', null).eq('guest_access_token_hash', claim.accessHash).select('id')
      if (error) throw new Error('Could not resume application.')
      if (!data?.length) return NextResponse.json({ message: 'This verification has already been used. Request a new code to continue.' }, { status: 400, headers })
      const response = NextResponse.json({ resumed: true }, { headers })
      response.cookies.set(MAGAZINE_OTP_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: MAGAZINE_GUEST_ACCESS_PATH, maxAge: 0 })
      response.cookies.set(MAGAZINE_GUEST_ACCESS_COOKIE, guestToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: MAGAZINE_GUEST_ACCESS_PATH, maxAge: MAGAZINE_GUEST_ACCESS_MAX_AGE })
      return response
    }
    const email = parsed.data.email.toLowerCase()
    const emailRate = await checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `magazine-resume-email:${email}` })
    if (!emailRate.success) return createRateLimitResponse(emailRate, 'Please wait a moment before requesting another code.')
    const resendRate = await checkRateLimit({ maxRequests: 1, windowSeconds: 60, identifier: `magazine-otp-send:${email}` })
    if (!resendRate.success) return createRateLimitResponse(resendRate, 'Please wait a minute before requesting another code.')
    const code = createMagazineOtpCode()
    let recoveryToken: string | null = null
    const campaign = await getActiveMagazineCampaign()
    const { data: order, error } = await db.from('magazine_feature_orders').select('id,guest_access_token_hash')
      .is('profile_id', null).eq('campaign_id', campaign.id).eq('customer_email', email).maybeSingle()
    if (error) throw new Error('Could not find application.')
    if (order?.guest_access_token_hash) {
      const origin = new URL(process.env.TOP100_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? '')
      if (origin.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(origin.hostname))) throw new Error('Invalid recovery origin.')
      const url = new URL('/magazine/feature', origin.origin)
      recoveryToken = createMagazineRecoveryToken(order.id, order.guest_access_token_hash)
      url.hash = `resume=${recoveryToken}`
      const link = url.toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      const sent = await sendTransactionalEmail({ to: email, subject: `${code} is your Africa Future Leaders magazine code`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#171717"><h1 style="font-size:24px">Continue your magazine application</h1><p style="font-size:16px;line-height:1.6">Enter this code on the application page to continue. You don’t need to leave the page or create an account.</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#fff4e3;padding:20px;text-align:center">${code}</p><p style="font-size:14px;line-height:1.6">Your code expires in 10 minutes. Never share it. If you prefer, <a href="${link}">use your private resume link</a> instead; the link expires in 30 minutes.</p><p style="font-size:14px">If you did not request this, ignore this email.</p></div>`,
        text: `Your Africa Future Leaders magazine code: ${code}\nEnter it on the application page within 10 minutes. Never share this code.\nOptional private resume link: ${url.toString()}\nIf you did not request this, ignore this email.`,
      })
      if (!sent.ok) throw new Error('Recovery email could not be delivered.')
    }
    const response = NextResponse.json({ codeSent: true, resendAfter: 60, message: 'If an application exists for this email, a six-digit code is on its way. Check your inbox and spam folder.' }, { headers })
    response.cookies.set(MAGAZINE_OTP_COOKIE, createMagazineOtpChallenge(email, code, recoveryToken), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: MAGAZINE_GUEST_ACCESS_PATH, maxAge: MAGAZINE_OTP_MAX_AGE })
    return response
  } catch {
    return NextResponse.json({ message: 'We could not complete verification right now. Please try again shortly.' }, { status: 503, headers })
  }
}
