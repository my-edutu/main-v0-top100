// lib/email/dm-notification.ts
// "You have a new message" email. Deliberately contains neither the message
// body nor either party's address — the conversation stays in the dashboard.
import type { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from './send'

export const DM_NOTIFY_WINDOW_MS = 60 * 60 * 1000

/** At most one notification per recipient per conversation per hour. */
export function shouldNotify(lastNotifiedAt: string | null, now: number = Date.now()): boolean {
  if (!lastNotifiedAt) return true
  const timestamp = Date.parse(lastNotifiedAt)
  if (Number.isNaN(timestamp)) return true
  return now - timestamp >= DM_NOTIFY_WINDOW_MS
}

export function buildDmNotification(input: {
  recipientName: string
  senderName: string
  siteUrl: string
}): { subject: string; html: string; text: string } {
  const dashboard = `${input.siteUrl.replace(/\/$/, '')}/dashboard`
  const firstName = input.recipientName.split(' ')[0] || 'there'

  const subject = `${input.senderName} sent you a message`
  const text =
    `Hi ${firstName},\n\n${input.senderName} sent you a message on the Africa Future Leaders member platform.\n\n` +
    `Read and reply here: ${dashboard}\n\n` +
    `You can turn these emails off in your dashboard settings.`

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111;line-height:1.6">
      <p>Hi ${escapeHtml(firstName)},</p>
      <p><strong>${escapeHtml(input.senderName)}</strong> sent you a message on the Africa Future Leaders member platform.</p>
      <p>
        <a href="${dashboard}" style="display:inline-block;background:#f97316;color:#fffaf0;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">
          Read and reply
        </a>
      </p>
      <p style="color:#666;font-size:14px">You can turn these emails off in your dashboard settings.</p>
    </div>
  `.trim()

  return { subject, html, text }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Best-effort notification. Never throws and never returns a failure to the
 * caller — a message must be delivered even when email is broken.
 */
export async function notifyNewMessage(
  supabase: ReturnType<typeof createAdminClient>,
  input: { conversationId: string; recipientId: string; senderName: string },
): Promise<void> {
  try {
    const { data: recipient, error } = await supabase
      .from('profiles')
      .select('email, full_name, notification_prefs')
      .eq('id', input.recipientId)
      .maybeSingle()

    if (error || !recipient?.email) return

    const prefs = (recipient.notification_prefs ?? {}) as Record<string, unknown>
    // Respect the member's existing messageAlerts preference; default on.
    if (prefs.messageAlerts === false) return

    const { data: conversation } = await supabase
      .from('dm_conversations')
      .select('last_notified_at')
      .eq('id', input.conversationId)
      .maybeSingle()

    if (!shouldNotify((conversation as any)?.last_notified_at ?? null)) return

    const built = buildDmNotification({
      recipientName: recipient.full_name ?? 'there',
      senderName: input.senderName,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://top100afl.com',
    })

    const result = await sendTransactionalEmail({
      to: recipient.email,
      toName: recipient.full_name ?? undefined,
      subject: built.subject,
      html: built.html,
      text: built.text,
    })

    if (!result.ok) {
      console.error('[dm-notify] send failed', input.conversationId, result.reason)
      return
    }

    // Stamp only after a successful send, so a failure retries on the next message.
    const { error: stampError } = await supabase
      .from('dm_conversations')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('id', input.conversationId)

    if (stampError) console.error('[dm-notify] could not stamp last_notified_at', input.conversationId, stampError)
  } catch (error) {
    console.error('[dm-notify] unexpected failure', input.conversationId, error)
  }
}
