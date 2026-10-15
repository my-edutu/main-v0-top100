// Transactional mail uses Brevo SMTP when its SMTP credentials are configured.
// The Brevo API remains a compatibility fallback for existing deployments.
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
  if (smtpLogin || smtpKey) {
    if (!smtpLogin || !smtpKey) return { ok: false, reason: 'BREVO_SMTP_LOGIN and BREVO_SMTP_KEY must both be configured.' }
    const port = Number(process.env.BREVO_SMTP_PORT || '587')
    if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, reason: 'BREVO_SMTP_PORT is invalid.' }
    const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'info@top100afl.com'
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
      await transporter.sendMail({
        from: { name: senderName, address: senderEmail },
        to: { name: input.toName, address: input.to },
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.idempotencyKey ? {
          messageId: `<${createHash('sha256').update(input.idempotencyKey).digest('hex')}@top100afl.com>`,
        } : {}),
      })
      return { ok: true }
    } catch {
      return { ok: false, reason: 'Brevo SMTP could not deliver the message.' }
    }
  }

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { ok: false, reason: 'Configure Brevo SMTP credentials or BREVO_API_KEY.' }

  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'info@top100afl.com'
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
