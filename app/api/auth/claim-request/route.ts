import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateCode } from '@/lib/access-codes'
import { verifySignupCaptcha } from '@/lib/auth/signup-turnstile'
import { getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// Checks eligibility before creating a password account and pending claim.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const awardeeId = String(body?.awardeeId ?? '').trim()
  const email = String(body?.email ?? '').trim().toLowerCase()
  const inviteCode = String(body?.inviteCode ?? '').trim()
  const captchaToken = String(body?.captchaToken ?? '')
  const password = typeof body?.password === 'string' ? body.password : ''
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
  if (password) {
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ message: 'Choose a password between 8 and 72 characters.' }, { status: 400 })
    }
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return NextResponse.json({ message: 'Could not create this account. If you already signed up, sign in and return here.' }, { status: 409 })
    }
    const { error: claimError } = await db.rpc('request_pending_awardee_claim', {
      p_awardee_id: awardeeId,
      p_user_id: created.user.id,
      p_email: email,
      p_code: inviteCode,
    })
    if (claimError) {
      const { error: cleanupError } = await db.auth.admin.deleteUser(created.user.id)
      if (cleanupError) console.error('[claim-request] could not clean up failed account', { code: cleanupError.code })
      return NextResponse.json({ message: 'Could not submit this claim. Try again or contact the admin team.' }, { status: 409 })
    }
    return NextResponse.json({ created: true })
  }
  return NextResponse.json({ ready: true })
}
