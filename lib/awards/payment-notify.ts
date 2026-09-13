import { sendEmail as defaultSendEmail } from '@/lib/email/brevo'
import { createAdminClient } from '@/lib/supabase/server'
import type { AwardPaymentCurrency } from '@/lib/payments/bachs/types'

export type AwardPaymentNotificationInput = {
  orderId: string
  profileId?: string | null
  recipientName?: string | null
  email?: string | null
  currency: AwardPaymentCurrency
  amountMinor: number
  paidAt: string
}

export type PaymentNotificationDb = {
  from(table: string): any
}

export type PaymentNotificationDeps = {
  db?: PaymentNotificationDb
  sendEmail?: typeof defaultSendEmail
  now?: () => string
}

export type AwardPaymentNotification = {
  subject: string
  html: string
  text: string
  inApp: { title: string; body: string }
}

export type PaymentNotificationResult = {
  sent: boolean
  duplicate: boolean
  channels: string[]
  errors: string[]
}

const AWARD_NOTIFICATION_STATUS = 'paid'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatIntegerWithCommas(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Format server-validated integer minor units without floating-point arithmetic. */
export function formatAwardPaymentAmount(amountMinor: number, currency: AwardPaymentCurrency): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new Error('Award payment amount must be a non-negative safe integer.')
  }

  const whole = Math.floor(amountMinor / 100)
  const minor = String(amountMinor % 100).padStart(2, '0')
  if (currency === 'NGN') {
    return minor === '00' ? `₦${formatIntegerWithCommas(whole)}` : `₦${formatIntegerWithCommas(whole)}.${minor}`
  }
  return `$${formatIntegerWithCommas(whole)}.${minor}`
}

function cleanName(value: string | null | undefined): string {
  const name = (value ?? '').trim()
  return name || 'Awardee'
}

function paidDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function buildAwardPaymentNotification(input: AwardPaymentNotificationInput): AwardPaymentNotification {
  const name = cleanName(input.recipientName)
  const amount = formatAwardPaymentAmount(input.amountMinor, input.currency)
  const date = paidDate(input.paidAt)
  const safeName = escapeHtml(name)
  const safeAmount = escapeHtml(amount)
  const safeDate = escapeHtml(date)

  const title = 'Award payment confirmed'
  const body = `Your award fee payment of ${amount} was confirmed. Delivery through GIG Logistics and its delivery charge are handled separately; we will guide you through that next step.`
  const text = [
    'Award payment confirmed',
    '',
    `Hi ${name},`,
    '',
    `Your award fee payment of ${amount} was confirmed on ${date}.`,
    '',
    'Delivery through GIG Logistics and its delivery charge are handled separately; we will guide you through that next step.',
    '',
    '— The Top100 Africa Future Leaders team',
  ].join('\n')
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fffaf4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf4;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #ffedd5;border-radius:24px;padding:32px;font-family:Helvetica,Arial,sans-serif;color:#1c1917;">
          <tr><td>
            <p style="margin:0 0 20px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ea580c;">Top100 Africa Future Leaders</p>
            <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#1c1917;">${title}</h1>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(0,0,0,0.7);">Hi ${safeName},</p>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(0,0,0,0.7);">Your award fee payment of <strong>${safeAmount}</strong> was confirmed on ${safeDate}.</p>
            <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(0,0,0,0.7);">${escapeHtml('Delivery through GIG Logistics and its delivery charge are handled separately; we will guide you through that next step.')}</p>
            <p style="margin:28px 0 0;font-size:13px;color:rgba(0,0,0,0.55);">— The Top100 Africa Future Leaders team</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  return { subject: title, html, text, inApp: { title, body } }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; message?: unknown }
  return candidate.code === '23505' || /duplicate key|already exists/i.test(String(candidate.message ?? ''))
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message?: unknown }).message ?? 'unknown error')
  return String(error ?? 'unknown error')
}

/**
 * Claim and send the award-only paid notification. The existing notification
 * log is the exactly-once boundary shared with historical payment milestones;
 * a Bachs webhook retry therefore cannot send a second email or in-app row.
 */
export async function notifyAwardPaymentConfirmed(
  input: AwardPaymentNotificationInput,
  dependencies: PaymentNotificationDeps = {},
): Promise<PaymentNotificationResult> {
  const notification = buildAwardPaymentNotification(input)
  const db = dependencies.db ?? (createAdminClient() as unknown as PaymentNotificationDb)
  const sendEmail = dependencies.sendEmail ?? defaultSendEmail
  const channels: string[] = []
  const errors: string[] = []

  let claimResult: { error?: unknown }
  try {
    claimResult = await db.from('award_notification_log').insert({
      order_id: input.orderId,
      profile_id: input.profileId ?? null,
      status: AWARD_NOTIFICATION_STATUS,
      channels: [],
    })
  } catch (error) {
    console.error('[bachs-award-notify] could not claim notification', { orderId: input.orderId, error })
    return { sent: false, duplicate: false, channels, errors: [describe(error)] }
  }

  if (claimResult?.error) {
    if (isUniqueViolation(claimResult.error)) return { sent: false, duplicate: true, channels, errors }
    console.error('[bachs-award-notify] could not claim notification', { orderId: input.orderId, error: claimResult.error })
    return { sent: false, duplicate: false, channels, errors: [describe(claimResult.error)] }
  }

  if (input.profileId) {
    try {
      const { error } = await db.from('user_notifications').insert({
        user_id: input.profileId,
        title: notification.inApp.title,
        body: notification.inApp.body,
        category: 'award',
        cta_label: 'View your award',
        cta_url: '/dashboard',
        delivered_at: dependencies.now?.() ?? new Date().toISOString(),
        metadata: { audience: 'all', source: 'award-payment', order_id: input.orderId, status: 'paid' },
      })
      if (error) errors.push(`in-app: ${describe(error)}`)
      else channels.push('in_app')
    } catch (error) {
      errors.push(`in-app: ${describe(error)}`)
    }
  }

  const email = (input.email ?? '').trim()
  if (email && (process.env.BREVO_API_KEY || dependencies.sendEmail)) {
    try {
      const sent = await sendEmail({ to: email, subject: notification.subject, html: notification.html, text: notification.text })
      if (sent) channels.push('email')
      else errors.push('email: Brevo reported a failure')
    } catch (error) {
      errors.push(`email: ${describe(error)}`)
    }
  }

  try {
    const { error } = await db
      .from('award_notification_log')
      .update({ channels, sent_at: channels.length > 0 ? dependencies.now?.() ?? new Date().toISOString() : null, error: errors.length ? errors.join(' | ') : null })
      .eq('order_id', input.orderId)
      .eq('status', AWARD_NOTIFICATION_STATUS)
    if (error) errors.push(`log: ${describe(error)}`)
  } catch (error) {
    errors.push(`log: ${describe(error)}`)
  }

  return { sent: channels.length > 0, duplicate: false, channels, errors }
}
