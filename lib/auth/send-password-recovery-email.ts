import { getRecoveryRedirectUrl, type RecoveryArea } from '@/lib/auth/password-recovery'
import { sendTransactionalEmail } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/server'

type SendPasswordRecoveryEmailInput = {
  email: string
  fullName?: string | null
  origin: string
  area: RecoveryArea
}

type SendPasswordRecoveryEmailResult =
  | { ok: true }
  | { ok: false; stage: 'token' | 'delivery'; reason?: string }

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

export async function sendPasswordRecoveryEmail({
  email,
  fullName,
  origin,
  area,
}: SendPasswordRecoveryEmailInput): Promise<SendPasswordRecoveryEmailResult> {
  const redirectTo = getRecoveryRedirectUrl(origin, area)
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (error || !data?.properties?.hashed_token) {
    return { ok: false, stage: 'token', reason: error?.code ?? error?.message }
  }

  const recoveryUrl = new URL(redirectTo)
  recoveryUrl.hash = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: 'recovery',
  }).toString()
  const emailContent = buildRecoveryEmail(recoveryUrl.toString(), area)
  const userName = fullName || (typeof data.user?.user_metadata?.full_name === 'string'
    ? data.user.user_metadata.full_name
    : undefined)
  const delivery = await sendTransactionalEmail({
    to: email,
    toName: userName || undefined,
    subject: 'Choose your Top100 password',
    ...emailContent,
  })

  if (!delivery.ok) {
    return { ok: false, stage: 'delivery', reason: delivery.reason }
  }

  return { ok: true }
}
