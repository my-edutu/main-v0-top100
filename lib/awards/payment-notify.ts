import { sendTransactionalEmail as defaultSendEmail, type SendInput } from '@/lib/email/send'
import { createAdminClient } from '@/lib/supabase/server'
import type { AwardPaymentCurrency } from '@/lib/payments/bachs/types'
import { SITE_URL } from '@/lib/site'

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
  sendEmail?: (input: SendInput) => Promise<{ ok: boolean; reason?: string }>
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

  const title = 'Your Top100 award payment is confirmed'
  const awardUrl = new URL('/dashboard/me/award/complete', SITE_URL).toString()
  const body = `Your award fee payment of ${amount} was confirmed. Delivery through GIG Logistics and its delivery charge are handled separately; we will guide you through that next step.`
  const text = [
    title,
    '',
    `Hi ${name},`,
    '',
    `Your award fee payment of ${amount} was confirmed on ${date}.`,
    '',
    'Delivery through GIG Logistics and its delivery charge are handled separately; we will guide you through that next step.',
    '',
    `View your award: ${awardUrl}`,
    '',
    '— The Top100 Africa Future Leaders team',
  ].join('\n')
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#101014;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#101014;padding:32px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#211c24;border:1px solid #39323b;border-radius:24px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#f8f4f8;">
          <tr><td>
            <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">Your award fee payment is confirmed. View your next steps.</span>
            <p style="margin:0 0 20px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#ffb77e;">Top100 Africa Future Leaders</p>
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:#ffffff;">${title}</h1>
            <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#d0c9d0;">Hi ${safeName},</p>
            <p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#d0c9d0;">We’ve received your award fee payment of <strong style="color:#ffffff;">${safeAmount}</strong> on ${safeDate}.</p>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#d0c9d0;">${escapeHtml('Your recognition is confirmed. Delivery through GIG Logistics, including its delivery charge, is arranged separately.')}</p>
            <p style="margin:0 0 24px;"><a href="${escapeHtml(awardUrl)}" style="display:inline-block;min-height:44px;padding:13px 22px;border-radius:12px;background:#f97316;color:#171412;font-size:15px;font-weight:700;text-decoration:none;">View my award</a></p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#aaa3ad;">If you need help with this payment, open your dashboard and contact the Top100 team.</p>
            <p style="margin:20px 0 0;font-size:13px;color:#aaa3ad;">— The Top100 Africa Future Leaders team</p>
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
 * Claim and send the award-only paid notification. Bachs may retry its signed
 * webhook after an email outage; preserve completed channels and retry only a
 * missing email. Resend's stable idempotency key covers concurrent replays.
 */
export async function notifyAwardPaymentConfirmed(
  input: AwardPaymentNotificationInput,
  dependencies: PaymentNotificationDeps = {},
): Promise<PaymentNotificationResult> {
  const notification = buildAwardPaymentNotification(input)
  const db = dependencies.db ?? (createAdminClient() as unknown as PaymentNotificationDb)
  const sendEmail = dependencies.sendEmail ?? defaultSendEmail
  let channels: string[] = []
  const errors: string[] = []
  let alreadyClaimed = false

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
    if (isUniqueViolation(claimResult.error)) {
      alreadyClaimed = true
      try {
        const { data, error } = await db
          .from('award_notification_log')
          .select('channels')
          .eq('order_id', input.orderId)
          .eq('status', AWARD_NOTIFICATION_STATUS)
          .maybeSingle()
        if (error || !data) throw error ?? new Error('Award notification claim could not be loaded.')
        channels = Array.isArray(data.channels)
          ? data.channels.filter((channel: unknown): channel is string => channel === 'in_app' || channel === 'email')
          : []
      } catch (error) {
        return { sent: false, duplicate: true, channels, errors: [`log: ${describe(error)}`] }
      }
      if (channels.includes('email') || !input.email?.trim()) {
        return { sent: channels.length > 0, duplicate: true, channels, errors }
      }
    }
    else {
    console.error('[bachs-award-notify] could not claim notification', { orderId: input.orderId, error: claimResult.error })
    return { sent: false, duplicate: false, channels, errors: [describe(claimResult.error)] }
    }
  }

  if (!alreadyClaimed && input.profileId) {
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
  if (email && !channels.includes('email')) {
    try {
      const result = await sendEmail({
        to: email,
        toName: cleanName(input.recipientName),
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
        idempotencyKey: `award-payment-confirmed/${input.orderId}`,
      })
      if (result.ok) channels.push('email')
      else errors.push(`email: ${result.reason ?? 'transactional email provider reported a failure'}`)
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
