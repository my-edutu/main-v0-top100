import 'server-only'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { env, smtpConfigured } from '@/lib/env'

let transporter: Transporter | null = null

function getTransport() {
  if (!smtpConfigured()) return null
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth:
        env.smtp.user && env.smtp.pass
          ? { user: env.smtp.user, pass: env.smtp.pass }
          : undefined,
      pool: true,
      maxConnections: 3,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })
  }
  return transporter
}

export type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  fromName?: string
  fromEmail?: string
}

export type SendEmailResult =
  | { ok: true; messageId: string; response: string; accepted: string[]; rejected: string[] }
  | { ok: false; error: string; code?: string }

/**
 * Real SMTP send. There is no simulated success path: without credentials the
 * caller records a failed attempt and tells the agent that email is not
 * configured.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const transport = getTransport()
  const fromEmail = input.fromEmail || env.smtp.fromEmail
  if (!transport || !fromEmail) {
    return {
      ok: false,
      error:
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM_EMAIL on the server.',
      code: 'SMTP_NOT_CONFIGURED',
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.to)) {
    return { ok: false, error: 'Recipient email address is invalid.', code: 'INVALID_RECIPIENT' }
  }

  try {
    const info = await transport.sendMail({
      from: { name: input.fromName || env.smtp.fromName, address: fromEmail },
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo || fromEmail,
      headers: { 'X-Entity-Ref-ID': `team-${Date.now()}` },
    })
    return {
      ok: true,
      messageId: info.messageId,
      response: info.response ?? 'accepted',
      accepted: (info.accepted ?? []).map(String),
      rejected: (info.rejected ?? []).map(String),
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message.slice(0, 500) : 'SMTP send failed',
      code: (error as { code?: string })?.code,
    }
  }
}
