// Transactional mail prefers Brevo SMTP, then a configured Resend sender, then
// the Brevo API. A provider failure is returned without trying another
// provider so an accepted message is not accidentally sent twice.
// `lib/brevo.ts` is a 'use server' module for the newsletter contact API.

import { createHash } from 'node:crypto'
import nodemailer from 'nodemailer'

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export type SendInput = {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  /** Stable key for provider-side deduplication of retried transactional messages. */
  idempotencyKey?: string
}

/**
 * Never throws. Callers are notification paths where an email failure must not
 * fail the underlying action, so the result is returned rather than raised.
 */
export async function sendTransactionalEmail(input: SendInput): Promise<{ ok: boolean; reason?: string }> {
  const smtpLogin = process.env.BREVO_SMTP_LOGIN?.trim()
  const smtpKey = process.env.BREVO_SMTP_KEY
  if (smtpLogin && smtpKey) {
    const port = Number(process.env.BREVO_SMTP_PORT || '587')
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, reason: 'BREVO_SMTP_PORT is invalid.' }
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'paul@top100afl.com'
    const senderName = process.env.BREVO_SENDER_NAME ?? 'Top100 Africa Future Leaders'
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port,
        secure: port === 465,
        auth: { user: smtpLogin, pass: smtpKey },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        disableFileAccess: true,
        disableUrlAccess: true,
      })
      const sendResult = await transporter.sendMail({
        from: { name: senderName, address: senderEmail },
        to: { name: input.toName, address: input.to },
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.idempotencyKey ? {
          messageId: `<${createHash('sha256').update(input.idempotencyKey).digest('hex')}@top100afl.com>`,
        } : {}),
      })
      const normalizedRecipient = input.to.trim().toLowerCase()
      const acceptedRecipients = sendResult.accepted as Array<string | { address?: string }>
      const accepted = acceptedRecipients.some((recipient) => {
        const address = typeof recipient === 'string' ? recipient : recipient.address
        return typeof address === 'string' && address.trim().toLowerCase() === normalizedRecipient
      })
      if (!accepted) {
        return {
          ok: false,
          reason: sendResult.rejected.length
            ? 'Brevo SMTP rejected the recipient.'
            : 'Brevo SMTP did not confirm acceptance of the recipient.',
        }
      }
      return { ok: true }
    } catch (error) {
      const smtpError = error && typeof error === 'object'
        ? error as { code?: unknown; responseCode?: unknown }
        : {}
      const code = typeof smtpError.code === 'string' ? smtpError.code : undefined
      const responseCode = typeof smtpError.responseCode === 'number' ? smtpError.responseCode : undefined
      const details = [code, responseCode].filter((value) => value !== undefined).join(' ')
      return {
        ok: false,
        reason: `Brevo SMTP could not deliver the message${details ? ` (${details})` : ''}.`,
      }
    }
  }

  // Keep older local and transitional deployments working when they have a
  // Resend configuration but no complete Brevo SMTP configuration.
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFrom = process.env.RESEND_FROM_EMAIL?.trim()
  if (resendApiKey && resendFrom) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          ...(input.idempotencyKey ? { 'Idempotency-Key': input.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          ...(input.text ? { text: input.text } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      })
      return response.ok
        ? { ok: true }
        : { ok: false, reason: `Resend returned ${response.status}` }
    } catch {
      return { ok: false, reason: 'Resend could not be reached.' }
    }
  }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    if (resendApiKey) return { ok: false, reason: 'RESEND_FROM_EMAIL must be a verified sender.' }
    if (smtpLogin || smtpKey) return { ok: false, reason: 'BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must both be configured.' }
    return { ok: false, reason: 'Configure Brevo SMTP credentials, RESEND_API_KEY, or BREVO_API_KEY.' }
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'paul@top100afl.com'
  const senderName = process.env.BREVO_SENDER_NAME ?? 'Top100 Africa Future Leaders'

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: input.to, ...(input.toName ? { name: input.toName } : {}) }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.text ? { textContent: input.text } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return { ok: false, reason: `Brevo returned ${response.status}: ${detail.slice(0, 200)}` }
    }

    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown email failure' }
  }
}
