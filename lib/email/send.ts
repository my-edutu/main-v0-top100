// lib/email/send.ts
// Resend (when configured), with the existing Brevo provider otherwise.
// `lib/brevo.ts` is a 'use server' module for the
// newsletter contact API; this is a separate plain module so it can be called
// from route handlers without server-action semantics.

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

export type SendInput = {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
}

/**
 * Never throws. Callers are notification paths where an email failure must not
 * fail the underlying action, so the result is returned rather than raised.
 */
export async function sendTransactionalEmail(input: SendInput): Promise<{ ok: boolean; reason?: string }> {
  if (process.env.RESEND_API_KEY) {
    if (!process.env.RESEND_FROM_EMAIL) return { ok: false, reason: 'RESEND_FROM_EMAIL must be a verified sender.' }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
        signal: AbortSignal.timeout(10000),
      })
      return response.ok ? { ok: true } : { ok: false, reason: `Resend returned ${response.status}` }
    } catch { return { ok: false, reason: 'Resend could not be reached.' } }
  }
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { ok: false, reason: 'BREVO_API_KEY is not configured' }

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
