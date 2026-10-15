import { SITE_URL } from '@/lib/site'
import { sendTransactionalEmail } from '@/lib/email/send'
import type { AwardPaymentCurrency } from '@/lib/payments/bachs/types'

export type PaymentProduct = 'award' | 'magazine'
export type PaymentEmailStatus = 'checkout' | 'paid' | 'failed' | 'expired' | 'review'

export type PaymentEmailInput = {
  product: PaymentProduct
  status: PaymentEmailStatus
  attemptId: string
  email: string
  name?: string | null
  currency: AwardPaymentCurrency
  amountMinor: number
  checkoutUrl?: string | null
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function amountLabel(amountMinor: number, currency: AwardPaymentCurrency) {
  const amount = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amountMinor / 100)
  return currency === 'NGN' ? `₦${amount}` : `$${amount}`
}

export async function sendPaymentLifecycleEmail(input: PaymentEmailInput): Promise<{ ok: boolean; reason?: string }> {
  const productName = input.product === 'award' ? 'award fee' : 'magazine feature'
  const name = input.name?.trim() || 'there'
  const amount = amountLabel(input.amountMinor, input.currency)
  const accountUrl = new URL(input.product === 'award' ? '/dashboard/me/award/payment' : '/magazine/feature', SITE_URL).toString()
  let subject: string
  let body: string
  let actionUrl = accountUrl
  let actionLabel = input.product === 'award' ? 'Open award payment' : 'Open magazine payment'

  if (input.status === 'checkout') {
    subject = `Your Top100 ${productName} checkout is ready`
    body = `Your ${productName} checkout for ${amount} is ready. Payment is not confirmed until the payment provider completes it.`
    actionUrl = input.checkoutUrl || accountUrl
    actionLabel = 'Continue to secure checkout'
  } else if (input.status === 'paid') {
    subject = `Your Top100 ${productName} payment is confirmed`
    body = `Your ${productName} payment of ${amount} has been confirmed. You can return to your account to continue with the next steps.`
  } else {
    const expired = input.status === 'expired'
    const review = input.status === 'review'
    subject = review
      ? `Your Top100 ${productName} payment needs a status check`
      : `Your Top100 ${productName} payment ${expired ? 'checkout expired' : 'was not confirmed'}`
    body = review
      ? `We could not confirm the final status of your ${productName} payment for ${amount}. Please do not start another payment yet. Check your account or reply to this email so our team can verify it.`
      : expired
      ? `Your ${productName} checkout for ${amount} expired before payment confirmation. If you already paid, please do not pay again; check your account or contact support so we can verify it.`
      : `The provider could not confirm your ${productName} payment for ${amount}. If you already paid, please do not try again yet; check your account or contact support so we can verify it.`
    actionLabel = review || input.status !== 'failed'
      ? 'Check payment status'
      : input.product === 'award' ? 'Check payment status' : 'Continue magazine application'
  }

  const safeSubject = escapeHtml(subject)
  const text = `Hi ${name},\n\n${body}\n\n${actionLabel}: ${actionUrl}\n\n— The Top100 Africa Future Leaders team`
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeSubject}</title></head><body style="margin:0;padding:24px;background:#f5f2ef;font-family:Arial,Helvetica,sans-serif;color:#171412"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e8e2dc;border-radius:16px"><tr><td style="padding:32px"><p style="margin:0 0 18px;font-size:12px;line-height:1.5;font-weight:700;letter-spacing:.12em;color:#9a4b16">TOP100 AFRICA FUTURE LEADERS</p><h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#171412">${safeSubject}</h1><p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#39332f">Hi ${escapeHtml(name)},</p><p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#39332f">${escapeHtml(body)}</p><p style="margin:0 0 24px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:13px 20px;border-radius:10px;background:#ef741b;color:#fff;font-size:15px;line-height:1.4;font-weight:700;text-decoration:none">${escapeHtml(actionLabel)}</a></p><p style="margin:0;font-size:13px;line-height:1.6;color:#716a65">If you need help, reply to this email and our team will assist.</p></td></tr></table></td></tr></table></body></html>`

  return sendTransactionalEmail({
    to: input.email,
    toName: name,
    subject,
    html,
    text,
    idempotencyKey: `payment-${input.status}/${input.attemptId}`,
  })
}
