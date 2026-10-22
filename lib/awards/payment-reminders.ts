import { sendTransactionalEmail as defaultSendEmail, type SendInput } from '@/lib/email/send'
import { formatAwardPaymentAmount } from '@/lib/awards/payment-notify'
import type { AwardPaymentCurrency } from '@/lib/payments/bachs/types'
import { SITE_URL } from '@/lib/site'

export type AwardPaymentReminderKind = 'pre_expiry' | 'incomplete' | 'retry'

export type AwardPaymentReminderRow = {
  reminder_id: string
  order_id: string
  payment_attempt_id: string
  reminder_kind: AwardPaymentReminderKind
  profile_id?: string | null
  recipient_name?: string | null
  email?: string | null
  currency: AwardPaymentCurrency
  amount_minor: number | string
  checkout_expires_at?: string | null
}

export type AwardPaymentReminderDb = {
  rpc(functionName: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

export type AwardPaymentReminderDeps = {
  sendEmail?: (input: SendInput) => Promise<{ ok: boolean; reason?: string }>
  limit?: number
  attemptId?: string | null
}

export type AwardPaymentReminderResult = {
  claimed: number
  sent: number
  failed: number
  errors: string[]
}

export function buildAwardPaymentReminder(input: Pick<AwardPaymentReminderRow, 'reminder_kind' | 'recipient_name' | 'currency' | 'amount_minor'>) {
  const name = (input.recipient_name ?? '').trim() || 'Awardee'
  const amountMinor = typeof input.amount_minor === 'number' ? input.amount_minor : Number(input.amount_minor)
  const amount = formatAwardPaymentAmount(amountMinor, input.currency)
  const retry = input.reminder_kind === 'retry'
  const preExpiry = input.reminder_kind === 'pre_expiry'
  const subject = preExpiry || retry ? 'Continue with your award' : 'Your Top100 award payment is not confirmed yet'
  const paymentUrl = new URL('/dashboard/me/award/payment', SITE_URL).toString()
  const expiryLabel = input.checkout_expires_at
    ? new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(input.checkout_expires_at))
    : null
  const statusLine = preExpiry
    ? `Your award fee checkout for ${amount} is still open${expiryLabel ? ` and is scheduled to expire at ${expiryLabel} WAT` : ''}. You can continue the same payment from your dashboard before it expires.`
    : retry
    ? `The payment provider could not complete your award fee payment of ${amount}. You can return to your dashboard to try again.`
    : `We have not received confirmation for your award fee payment of ${amount} yet. Your checkout has expired, so you can return to your dashboard to start again.`
  const alreadyPaid = 'If you already paid, please do not pay again. Check your dashboard for the latest status or contact the Top100 team so we can verify it.'
  const text = [
    subject,
    '',
    `Hi ${name},`,
    '',
    statusLine,
    '',
    alreadyPaid,
    '',
    `Continue from your dashboard: ${paymentUrl}`,
    '',
    '— The Top100 Africa Future Leaders team',
  ].join('\n')
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${subject}</title></head>
<body style="margin:0;padding:32px 12px;background:#101014;font-family:Arial,Helvetica,sans-serif;color:#f8f4f8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#211c24;border:1px solid #39323b;border-radius:24px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 20px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#ffb77e;">Top100 Africa Future Leaders</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#fff;">${escapeHtml(subject)}</h1>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#d0c9d0;">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#d0c9d0;">${escapeHtml(statusLine)}</p>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#d0c9d0;">${escapeHtml(alreadyPaid)}</p>
        <p style="margin:0 0 24px;"><a href="${escapeHtml(paymentUrl)}" style="display:inline-block;min-height:44px;padding:13px 22px;border-radius:12px;background:#f97316;color:#171412;font-size:15px;font-weight:700;text-decoration:none;">${preExpiry ? 'Continue with your award' : 'Continue to payment'}</a></p>
        <p style="margin:0;font-size:13px;color:#aaa3ad;">— The Top100 Africa Future Leaders team</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`

  return { subject, html, text }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message ?? 'unknown error')
  return String(error ?? 'unknown error')
}

function reminderRows(value: unknown): AwardPaymentReminderRow[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is AwardPaymentReminderRow => Boolean(
    entry && typeof entry === 'object' &&
    typeof (entry as AwardPaymentReminderRow).reminder_id === 'string' &&
    typeof (entry as AwardPaymentReminderRow).payment_attempt_id === 'string' &&
    ((entry as AwardPaymentReminderRow).reminder_kind === 'pre_expiry' || (entry as AwardPaymentReminderRow).reminder_kind === 'incomplete' || (entry as AwardPaymentReminderRow).reminder_kind === 'retry') &&
    typeof (entry as AwardPaymentReminderRow).email === 'string' &&
    ((entry as AwardPaymentReminderRow).currency === 'NGN' || (entry as AwardPaymentReminderRow).currency === 'USD'),
  ))
}

/** Claim and deliver reminders for soon-to-expire checkouts and unfinished payments. */
export async function processAwardPaymentReminders(
  db: AwardPaymentReminderDb,
  dependencies: AwardPaymentReminderDeps = {},
): Promise<AwardPaymentReminderResult> {
  const sendEmail = dependencies.sendEmail ?? defaultSendEmail
  const { data, error } = await db.rpc('claim_award_payment_reminders', {
    p_limit: dependencies.limit ?? 30,
    p_attempt_id: dependencies.attemptId ?? null,
  })
  if (error) return { claimed: 0, sent: 0, failed: 1, errors: [`claim: ${describe(error)}`] }

  const rows = reminderRows(data)
  const result: AwardPaymentReminderResult = { claimed: rows.length, sent: 0, failed: 0, errors: [] }
  for (const row of rows) {
    const email = row.email?.trim()
    let sent = false
    let failure: string | null = null
    try {
      if (!email) throw new Error('No awardee email is available for this reminder.')
      const { data: allowed, error: eligibilityError } = await db.rpc('prepare_award_payment_reminder_delivery', {
        p_reminder_id: row.reminder_id,
      })
      if (eligibilityError) throw new Error(`Could not recheck payment status: ${describe(eligibilityError)}`)
      if (allowed !== true) continue
      const notification = buildAwardPaymentReminder(row)
      const delivery = await sendEmail({
        to: email,
        toName: (row.recipient_name ?? '').trim() || 'Awardee',
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
        idempotencyKey: `award-payment-reminder/${row.payment_attempt_id}/${row.reminder_kind}`,
      })
      if (!delivery.ok) throw new Error(delivery.reason ?? 'Transactional email provider reported a failure.')
      sent = true
      result.sent += 1
    } catch (error) {
      failure = describe(error)
      result.failed += 1
      result.errors.push(`${row.payment_attempt_id}: ${failure}`)
    }

    try {
      const { error: finishError } = await db.rpc('finish_award_payment_reminder', {
        p_reminder_id: row.reminder_id,
        p_sent: sent,
        p_error: failure,
      })
      if (finishError) {
        result.failed += 1
        result.errors.push(`${row.payment_attempt_id}: could not finalize reminder state: ${describe(finishError)}`)
      }
    } catch (error) {
      result.failed += 1
      result.errors.push(`${row.payment_attempt_id}: could not finalize reminder state: ${describe(error)}`)
    }
  }
  return result
}
