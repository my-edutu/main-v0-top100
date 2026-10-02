import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateCode } from '@/lib/access-codes'
import { verifySignupCaptcha } from '@/lib/auth/signup-turnstile'
import { getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// Checks eligibility before asking Supabase to send an email OTP.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const awardeeId = String(body?.awardeeId ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const inviteCode = String(body?.inviteCode ?? '').trim()
  const captchaToken = String(body?.captchaToken ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(awardeeId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !inviteCode) {
    return NextResponse.json({ message: 'Select your record and enter your email and invite code.' }, { status: 400 })
  }
  const captchaOk = await verifySignupCaptcha(captchaToken, {
    secret: process.env.TURNSTILE_SECRET_KEY,
    hostnames: process.env.NODE_ENV === 'production'
      ? process.env.TURNSTILE_HOSTNAMES || 'top100afl.com,www.top100afl.com'
      : 'localhost,127.0.0.1',
    remoteIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    nodeEnv: process.env.NODE_ENV,
  })
  if (!captchaOk) return NextResponse.json({ message: 'Complete the security check.' }, { status: 400 })

  const limited = await rateLimitResponse([
    { maxRequests: 5, windowSeconds: 60, identifier: `claim-request-person:${awardeeId}:${email}` },
    { maxRequests: 1200, windowSeconds: 60, identifier: `claim-request-network:${getClientIdentifier(request.headers)}` },
  ], 'Too many attempts. Try again shortly.')
  if (limited) return limited

  const db = createAdminClient()
  const { data: awardee, error } = await db.from('awardees')
    .select('id,email,profile_id')
    .eq('id', awardeeId)
    .maybeSingle()
  if (error || !awardee || awardee.profile_id || !awardee.email || awardee.email.trim().toLowerCase() !== email) {
    return NextResponse.json({ message: 'This record cannot be claimed with that email. Contact the admin team if your email has changed.' }, { status: 403 })
  }
  const code = await validateCode(inviteCode, email)
  if (!code.ok) return NextResponse.json({ message: 'The invite code is invalid or unavailable for this email.' }, { status: 403 })
  return NextResponse.json({ ready: true })
}
