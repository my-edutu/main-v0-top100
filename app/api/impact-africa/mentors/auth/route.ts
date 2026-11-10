import { NextResponse } from 'next/server'
import { verifySignupCaptcha } from '@/lib/auth/signup-turnstile'
import { sendTransactionalEmail } from '@/lib/email/send'
import { getClientIdentifier, rateLimitResponse } from '@/lib/rate-limit'
import { isTrustedRequestOrigin } from '@/lib/security/same-origin'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const sent = () => NextResponse.json({ sent: true })
const problem = (message: string, status: number) => NextResponse.json({ message }, { status })

export async function POST(request: Request) {
  if (!isTrustedRequestOrigin(request)) return problem('Open the mentor page to continue.', 403)

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const send = body?.action === 'send'
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (email.length > 254 || !/^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/.test(email)) {
    return problem('Enter a valid email address.', 400)
  }
  if (!send && (body?.action !== 'verify' || !/^\d{6,10}$/.test(code))) {
    return problem('Enter the code from your email.', 400)
  }
  if (send) {
    const captcha = await verifySignupCaptcha(typeof body.captchaToken === 'string' ? body.captchaToken : undefined, {
      secret: process.env.TURNSTILE_SECRET_KEY,
      hostnames: process.env.NODE_ENV === 'production'
        ? process.env.TURNSTILE_HOSTNAMES || 'top100afl.com,www.top100afl.com'
        : 'localhost,127.0.0.1',
      nodeEnv: process.env.NODE_ENV,
    })
    if (!captcha) return problem('Complete the security check and try again.', 400)
  }

  const task = send ? 'send' : 'verify'
  const limited = await rateLimitResponse([
    { identifier: `impact-mentor:${task}:email:${email}`, maxRequests: send ? 3 : 8, windowSeconds: 900 },
    { identifier: `impact-mentor:${task}:network:${getClientIdentifier(request.headers)}`, maxRequests: send ? 30 : 120, windowSeconds: 300 },
  ], 'Too many attempts. Wait a few minutes and try again.')
  if (limited) return limited

  const db = createAdminClient()
  const { data: loginMethod, error: lookupError } = await db.rpc('impact_mentor_login_method', { p_email: email })
  if (lookupError) {
    console.error('[mentor-auth] Login method lookup failed', lookupError.code)
    return problem('Mentor sign-in is temporarily unavailable. Try again shortly.', 503)
  }
  // Keep the send response the same for existing accounts.
  if (loginMethod === 'top100') return send ? sent() : problem('That code could not be verified. If you have a Top100 password, use your usual sign-in.', 400)

  if (!send) {
    const auth = await createClient()
    // GoTrue issues a signup code for a new email and a magic-link code for a returning mentor.
    const { data, error } = await auth.auth.verifyOtp({ email, token: code, type: 'email' })
    if (error || !data.session) return problem('That code is wrong or has expired. Try again or ask for a new code.', 400)
    return NextResponse.json({ verified: true }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (loginMethod === 'new') {
    // GoTrue can give passwordless accounts a generated password hash. A
    // server-owned marker lets these mentors keep using codes when they return.
    const { error } = await db.auth.admin.createUser({
      email, email_confirm: false, app_metadata: { impact_africa_mentor_login: true },
    })
    if (error) {
      if (error.code === 'email_exists') return sent()
      console.error('[mentor-auth] Could not create a mentor account', error.code)
      return problem('We could not start your sign-in. Try again shortly.', 503)
    }
  }

  const { data, error } = await db.auth.admin.generateLink({ type: 'magiclink', email })
  const otp = data?.properties?.email_otp
  if (error || !otp || !/^\d{6,10}$/.test(otp)) {
    console.error('[mentor-auth] Could not issue a mentor code', error?.code)
    return problem('We could not email your code. Try again shortly.', 503)
  }
  const result = await sendTransactionalEmail({
    to: email,
    subject: 'Your Impact Africa mentor sign-in code',
    text: `Your Impact Africa mentor sign-in code is ${otp}. Enter this code on the page where you asked for it. If you did not ask for this code, ignore this email.`,
    html: `<div lang="en"><p>Enter this code on the Impact Africa mentor page.</p><p style="font:700 26px monospace">${otp}</p><p>If you did not ask for this code, ignore this email.</p></div>`,
    requireBrevoSmtp: true,
  })
  return result.ok || result.delivery === 'unknown' ? sent() : problem('We could not email your code. Try again shortly.', 503)
}
