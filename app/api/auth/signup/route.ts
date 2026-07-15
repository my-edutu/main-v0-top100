// app/api/auth/signup/route.ts
// Public endpoint: self-registration gated by an admin-issued access code.
//
// Flow: rate-limit + captcha -> validate access code -> create Supabase auth
// user (service role) -> create profile -> consume code. On any post-user
// failure we delete the just-created auth user to avoid orphans.
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateCode, consumeCode, normalizeCode } from '@/lib/access-codes'
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
  createRateLimitResponse,
} from '@/lib/rate-limit'
import { sanitizeEmail, sanitizeInput } from '@/lib/security'

export const runtime = 'nodejs'

const VALIDATION_MESSAGES: Record<string, string> = {
  not_found: 'Invite code is invalid.',
  inactive: 'This invite code has already been used or was revoked.',
  exhausted: 'This invite code has no uses left.',
  expired: 'This invite code has expired. Ask the admin team for a new one.',
  email_mismatch: 'This invite code is registered to a different email address.',
}

async function verifyCaptchaToken(token: string | undefined): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  // Captcha not configured -> skip (dev / not-yet-enabled).
  if (!secretKey) return true
  if (!token) return false

  try {
    const body = new URLSearchParams({ secret: secretKey, response: token })
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  // 1. Rate limit (strict auth bucket)
  const identifier = getClientIdentifier(request.headers)
  const rl = checkRateLimit({ ...RATE_LIMITS.AUTH, identifier: `signup:${identifier}` })
  if (!rl.success) {
    return createRateLimitResponse(rl, 'Too many signup attempts. Please try again shortly.')
  }

  // 2. Parse + validate input
  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const email = sanitizeEmail(String(payload.email ?? ''))
  const password = String(payload.password ?? '')
  const name = sanitizeInput(String(payload.name ?? ''))
  const headline = sanitizeInput(String(payload.headline ?? ''))
  const rawCode = String(payload.inviteCode ?? '')
  const captchaToken = payload.captchaToken ? String(payload.captchaToken) : undefined

  if (!email) return NextResponse.json({ message: 'A valid email address is required.' }, { status: 400 })
  if (!password || password.length < 8) {
    return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 })
  }
  if (!name) return NextResponse.json({ message: 'Your full name is required.' }, { status: 400 })
  if (!rawCode.trim()) return NextResponse.json({ message: 'An invite code is required.' }, { status: 400 })

  // 3. Captcha (if configured)
  const captchaOk = await verifyCaptchaToken(captchaToken)
  if (!captchaOk) {
    return NextResponse.json({ message: 'CAPTCHA verification failed. Please try again.' }, { status: 400 })
  }

  // 4. Validate the access code (bound to email if the code specifies one)
  const validation = await validateCode(rawCode, email)
  if (!validation.ok) {
    return NextResponse.json(
      { message: VALIDATION_MESSAGES[validation.reason] ?? 'Invite code is invalid.' },
      { status: 403 },
    )
  }

  const supabase = createAdminClient()

  // 5. Create the auth user. Role lives in app_metadata so the JWT carries it.
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, headline: headline || null },
    app_metadata: { role: 'user' },
  })

  if (createError || !created?.user) {
    const msg = createError?.message ?? ''
    const isDuplicate = /already|exist|registered/i.test(msg)
    return NextResponse.json(
      { message: isDuplicate ? 'An account with this email already exists. Try signing in.' : 'Could not create your account. Please try again.' },
      { status: isDuplicate ? 409 : 500 },
    )
  }

  const userId = created.user.id

  // 6. Create the profile row. Roll back the auth user if this fails.
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || userId.slice(0, 8)
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    email,
    role: 'user',
    full_name: name,
    headline: headline || 'Top100 Africa Future Leaders awardee',
    membership_status: 'pending',
    slug,
    is_public: true,
    access_code: normalizeCode(rawCode),
    bio_update_count: 0,
    bio_update_limit: 2,
    notification_prefs: {
      recruiterVisible: true,
      emailVisible: false,
      opportunityAlerts: true,
      magazineAlerts: true,
      messageAlerts: true,
      eventReminders: true,
    },
  })

  if (profileError) {
    // best-effort rollback so a failed signup doesn't strand an auth user
    await supabase.auth.admin.deleteUser(userId).catch(() => {})
    // A slug/email collision is the most likely cause.
    const dup = /duplicate|unique/i.test(profileError.message)
    return NextResponse.json(
      { message: dup ? 'An account with these details already exists.' : 'Could not finish creating your profile. Please try again.' },
      { status: dup ? 409 : 500 },
    )
  }

  // 7. Consume the code (non-fatal if it races; account already exists).
  await consumeCode(rawCode, userId)

  return NextResponse.json(
    { message: 'Account created. You can now sign in.', userId, email },
    { status: 201 },
  )
}
