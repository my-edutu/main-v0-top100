// Transactional mail uses the configured Top100 Stalwart transport. Older
// deployments can still use their existing provider configuration. A send
// failure never retries through a second provider.
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
  /** In-memory attachments only; callers cannot fetch files or arbitrary URLs. */
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
  /** Legacy option name. Requires a configured SMTP transport. */
  requireBrevoSmtp?: boolean
  awardOutreach?: { unsubscribeUrl: string }
}

/**
 * Never throws. Callers are notification paths where an email failure must not
 * fail the underlying action, so the result is returned rather than raised.
 */
export async function sendTransactionalEmail(input: SendInput): Promise<{ ok: boolean; reason?: string; delivery?: 'not_sent' | 'unknown'; queueId?: string }> {
  const stalwartHost = process.env.AWARD_OUTREACH_SMTP_HOST?.trim()
  const useStalwart = Boolean(input.awardOutreach || stalwartHost)
  const provider = useStalwart ? 'Top100 SMTP' : 'Brevo SMTP'
  const smtpLogin = useStalwart ? process.env.AWARD_OUTREACH_SMTP_USER?.trim() : process.env.BREVO_SMTP_LOGIN?.trim()
  const smtpKey = useStalwart ? process.env.AWARD_OUTREACH_SMTP_PASSWORD : process.env.BREVO_SMTP_KEY
  if ((useStalwart && !stalwartHost) || ((useStalwart || input.requireBrevoSmtp) && (!smtpLogin || !smtpKey))) {
    return { ok: false, reason: `${provider} is not configured.`, delivery: 'not_sent' }
  }
  if (smtpLogin && smtpKey) {
    const port = Number(useStalwart ? process.env.AWARD_OUTREACH_SMTP_PORT || '465' : process.env.BREVO_SMTP_PORT || '587')
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { ok: false, reason: `${provider} port is invalid.`, delivery: 'not_sent' }
    }
    const senderEmail = useStalwart ? smtpLogin : process.env.BREVO_SENDER_EMAIL?.trim() || 'paul@top100afl.com'
    const senderName = input.awardOutreach
      ? 'Gabriel from Top100 Africa Future Leaders'
      : process.env.BREVO_SENDER_NAME ?? 'Top100 Africa Future Leaders'
    try {
      const transporter = nodemailer.createTransport({
        host: useStalwart ? stalwartHost : process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port,
        secure: port === 465,
        requireTLS: useStalwart && port !== 465,
        auth: { user: smtpLogin, pass: smtpKey },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
        disableFileAccess: true,
        disableUrlAccess: true,
      })
      const sendResult = await transporter.sendMail({
        from: { name: senderName, address: senderEmail },
        ...(input.awardOutreach ? {
          replyTo: 'nigeriatop100@gmail.com',
          headers: { 'List-Unsubscribe': `<${input.awardOutreach.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        } : {}),
        to: { name: input.toName, address: input.to },
        subject: input.subject,
        html: input.html,
        ...(input.attachments ? { attachments: input.attachments } : {}),
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
          delivery: sendResult.rejected.length ? 'not_sent' : 'unknown',
          reason: sendResult.rejected.length
            ? `${provider} rejected the recipient.`
            : `${provider} did not confirm acceptance of the recipient.`,
        }
      }
      const match = input.awardOutreach && typeof sendResult.response === 'string' ? sendResult.response.match(/Message queued with id ([0-9a-f]+)\.?/i) : null
      const queueId = match ? BigInt(`0x${match[1]}`).toString() : undefined
      return queueId ? { ok: true, queueId } : { ok: true }
    } catch (error) {
      const smtpError = error && typeof error === 'object'
        ? error as { code?: unknown; responseCode?: unknown }
        : {}
      const code = typeof smtpError.code === 'string' ? smtpError.code : undefined
      const responseCode = typeof smtpError.responseCode === 'number' ? smtpError.responseCode : undefined
      const details = [code, responseCode].filter((value) => value !== undefined).join(' ')
      return {
        ok: false,
        delivery: responseCode && responseCode >= 400 && responseCode <= 599 ? 'not_sent' : 'unknown',
        reason: `${provider} could not deliver the message${details ? ` (${details})` : ''}.`,
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
          ...(input.attachments ? { attachments: input.attachments.map(file => ({ filename: file.filename, content: file.content.toString('base64'), content_type: file.contentType })) } : {}),
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
        ...(input.attachments ? { attachment: input.attachments.map(file => ({ name: file.filename, content: file.content.toString('base64') })) } : {}),
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
