import { NextRequest, NextResponse } from 'next/server'

import { getRecoveryRedirectUrl, type RecoveryArea } from '@/lib/auth/password-recovery'
import { sendTransactionalEmail } from '@/lib/email/send'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier } from '@/lib/rate-limit'
import { isTrustedRequestOrigin } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'

const GENERIC_RESPONSE = {
  message: 'If that address belongs to an account, you’ll receive a link to choose a password.',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] as string)
}

function buildRecoveryEmail(recoveryUrl: string, area: RecoveryArea): { html: string; text: string } {
  const accountType = area === 'admin' ? 'administrator' : 'member'
  const safeUrl = escapeHtml(recoveryUrl)
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Choose your Top100 password</title></head>
<body style="margin:0;background:#fcf9f4;color:#0f172a;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">Choose a password and return to your Top100 account.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fcf9f4"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:16px">
      <tr><td align="center" style="padding:32px 24px 20px"><img src="https://www.top100afl.com/Top100%20Africa%20Future%20leaders%20Logo%20.png" width="220" alt="Top100 Africa Future Leaders" style="display:block;width:220px;max-width:100%;height:auto"></td></tr>
      <tr><td style="padding:0 24px 32px">
        <p style="margin:0 0 12px;color:#c2410c;font-size:12px;letter-spacing:1px">ACCOUNT RECOVERY</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:34px;font-weight:600">Choose your password</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:26px;color:#475569">Use the button below to set a password for your Top100 ${accountType} account. This works whether you forgot your password or never chose one.</p>
        <table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="#c2410c" style="border-radius:10px"><a href="${safeUrl}" style="display:inline-block;padding:15px 24px;font-size:16px;line-height:22px;font-weight:600;color:#fff;text-decoration:none">Choose a password</a></td></tr></table>
        <p style="margin:24px 0 0;font-size:14px;line-height:23px;color:#475569">This personal link can only be used once. If it has expired, request a new link from the sign-in page.</p>
        <p style="margin:16px 0 0;font-size:14px;line-height:23px;color:#475569">If you didn’t request this email, you can ignore it. Your password will stay the same.</p>
      </td></tr>
    </table><p style="margin:20px 0 0;font-size:12px;line-height:20px;color:#64748b">Top100 Africa Future Leaders</p>
  </td></tr></table>
</body></html>`
  const text = `Choose your Top100 ${accountType} password\n\nUse this personal link to set a password. It can only be used once:\n${recoveryUrl}\n\nIf you didn’t request this email, you can ignore it. Your password will stay the same.`
  return { html, text }
}

function getRecoveryOrigin(request: NextRequest): string {
  const configuredUrl = process.env.TOP100_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (configuredUrl) return new URL(configuredUrl).origin
  if (process.env.NODE_ENV !== 'production') return request.nextUrl.origin
  throw new Error('The public site URL is not configured.')
}

export async function POST(request: NextRequest) {
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json({ message: 'Cross-origin request blocked.' }, { status: 403 })
  }

  let payload: { email?: unknown; area?: unknown }
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid body')
    payload = parsed as { email?: unknown; area?: unknown }
  } catch {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 })
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 })
  }
  if (payload.area !== 'admin' && payload.area !== 'member') {
    return NextResponse.json({ message: 'Choose a valid account type.' }, { status: 400 })
  }
  const area = payload.area as RecoveryArea

  const clientIdentifier = getClientIdentifier(request.headers)
  for (const config of [
    { maxRequests: 10, windowSeconds: 60, identifier: `password-reset:ip:${clientIdentifier}` },
    { maxRequests: 3, windowSeconds: 900, identifier: `password-reset:email:${email}` },
  ]) {
    const result = await checkRateLimit(config)
    if (!result.success) {
      return createRateLimitResponse(result, 'Too many reset requests. Please wait and try again.')
    }
  }

  try {
    const origin = getRecoveryOrigin(request)
    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: getRecoveryRedirectUrl(origin, area) },
    })

    // Supabase returns the same generic result for an address without an account.
    if (error || !data?.properties?.hashed_token) {
      console.error('[password-reset] token generation failed', { status: error?.status, code: error?.code })
      return NextResponse.json(GENERIC_RESPONSE)
    }

    const recoveryUrl = new URL(getRecoveryRedirectUrl(origin, area))
    recoveryUrl.hash = new URLSearchParams({
      token_hash: data.properties.hashed_token,
      type: 'recovery',
    }).toString()
    const emailContent = buildRecoveryEmail(recoveryUrl.toString(), area)
    const delivery = await sendTransactionalEmail({
      to: email,
      toName: typeof data.user?.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name
        : undefined,
      subject: 'Choose your Top100 password',
      ...emailContent,
    })

    if (!delivery.ok) {
      console.error('[password-reset] email delivery failed', { reason: delivery.reason })
    }
  } catch (error) {
    console.error('[password-reset] request failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    })
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
