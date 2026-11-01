import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { sendTransactionalEmail } from '@/lib/email/send'
import { FESTIVAL_KEY } from './config'
import type { FestivalTicket } from './interest'
import { readFestivalInterest } from './server'
import { buildFestivalTicketEmail, renderFestivalTicket } from './ticket'

/** Only the server's authenticated account email is passed by the member routes. */
export async function sendFestivalTicketEmail(memberId: string, email: string): Promise<FestivalTicket['emailStatus']> {
  const db = createAdminClient()
  const view = await readFestivalInterest(memberId)
  if (!view.ticket || !view.interest || view.payment !== 'confirmed') return 'failed'
  if (view.ticket.emailStatus === 'sent') return 'sent'
  const claim = randomUUID()
  const now = new Date()
  const { data, error } = await db.from('festival_attendance_interests')
    .update({ ticket_email_claimed_at: now.toISOString(), ticket_email_claim_token: claim })
    .eq('festival_key', FESTIVAL_KEY).eq('member_id', memberId)
    .eq('ticket_id', view.ticket.id).is('ticket_email_sent_at', null)
    .or(`ticket_email_claimed_at.is.null,ticket_email_claimed_at.lt.${new Date(now.getTime() - 120_000).toISOString()}`)
    .select('ticket_id').maybeSingle()
  if (error) return 'failed'
  if (!data) return 'pending' // Already claimed by another request, or accepted meanwhile.
  let accepted = false
  try {
    const details = { id: view.ticket.id, ...view.interest }
    const image = await renderFestivalTicket(details)
    const result = await sendTransactionalEmail({
      to: email, toName: details.fullName,
      ...buildFestivalTicketEmail(details),
      requireBrevoSmtp: true,
      idempotencyKey: `festival-ticket/${FESTIVAL_KEY}/${view.ticket.id}`,
      attachments: [{ filename: 'Africa-Future-Leaders-Festival-2026-ticket.png', content: image, contentType: 'image/png' }],
    })
    accepted = result.ok
  } catch {
    // Registration survives rendering/provider failure. The member can download or retry.
  }
  const { error: stampError } = await db.from('festival_attendance_interests').update({
    ticket_email_sent_at: accepted ? new Date().toISOString() : null,
    ticket_email_failed_at: accepted ? null : new Date().toISOString(),
    ticket_email_claimed_at: null,
    ticket_email_claim_token: null,
  }).eq('festival_key', FESTIVAL_KEY).eq('member_id', memberId).eq('ticket_email_claim_token', claim)
  return stampError ? 'pending' : accepted ? 'sent' : 'failed'
}
