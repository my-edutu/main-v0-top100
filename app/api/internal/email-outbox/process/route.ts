import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { buildDmNotification, shouldNotify } from '@/lib/email/dm-notification'
import { sendTransactionalEmail } from '@/lib/email/send'

export const runtime = 'nodejs'
export const maxDuration = 60

type OutboxJob = {
  id: string
  kind: 'welcome' | 'direct_message'
  recipient_id: string
  conversation_id: string | null
  sender_name: string
}

function authorized(request: NextRequest) {
  const secret = process.env.EMAIL_OUTBOX_WORKER_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (!secret || !supplied || secret.length !== supplied.length) return false
  return timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

async function finish(db: ReturnType<typeof createAdminClient>, jobId: string, success: boolean, error?: string) {
  const { error: finishError } = await db.rpc('finish_member_email_outbox', {
    p_id: jobId,
    p_success: success,
    p_error: error ?? null,
  })
  if (finishError) throw new Error(`Could not finish email job: ${finishError.message}`)
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

  const db = createAdminClient()
  const { data, error } = await db.rpc('claim_member_email_outbox', { p_limit: 25 })
  if (error) {
    console.error('[email-outbox] could not claim jobs', error)
    return NextResponse.json({ message: 'Email queue is unavailable.' }, { status: 503 })
  }

  const jobs = (data ?? []) as OutboxJob[]
  let sent = 0
  let deferred = 0
  for (const job of jobs) {
    try {
      const { data: recipient, error: recipientError } = await db
        .from('profiles')
        .select('email,full_name,notification_prefs')
        .eq('id', job.recipient_id)
        .maybeSingle()
      if (recipientError) throw new Error(`Could not load recipient: ${recipientError.message}`)

      const prefs = (recipient?.notification_prefs ?? {}) as Record<string, unknown>
      if (!recipient?.email || (job.kind === 'direct_message' && prefs.messageAlerts === false)) {
        await finish(db, job.id, true)
        deferred += 1
        continue
      }

      let message: { subject: string; html: string; text: string }
      if (job.kind === 'direct_message') {
        if (!job.conversation_id) throw new Error('Direct-message email is missing its conversation.')
        const { data: conversation, error: conversationError } = await db
          .from('dm_conversations')
          .select('last_notified_at')
          .eq('id', job.conversation_id)
          .maybeSingle()
        if (conversationError) throw new Error(`Could not load conversation: ${conversationError.message}`)
        if (!shouldNotify(conversation?.last_notified_at ?? null)) {
          await finish(db, job.id, true)
          deferred += 1
          continue
        }
        message = buildDmNotification({
          recipientName: recipient.full_name ?? 'there',
          senderName: job.sender_name,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://top100afl.com',
        })
      } else {
        const firstName = (recipient.full_name ?? '').trim().split(/\s+/)[0] || 'there'
        const dashboardUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://top100afl.com').replace(/\/$/, '')}/dashboard`
        message = {
          subject: 'Welcome to Africa Future Leaders',
          text: `Hi ${firstName},\n\nWelcome to the Africa Future Leaders awardee community. Your dashboard is ready: ${dashboardUrl}`,
          html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#171412;line-height:1.6"><p>Hi ${escapeHtml(firstName)},</p><p>Welcome to the Africa Future Leaders awardee community. Your dashboard is ready whenever you are.</p><p><a href="${dashboardUrl}">Open your dashboard</a></p></div>`,
        }
      }

      const result = await sendTransactionalEmail({
        to: recipient.email,
        toName: recipient.full_name ?? undefined,
        ...message,
        idempotencyKey: job.id,
      })
      if (!result.ok) throw new Error(result.reason ?? 'Email provider rejected the message.')

      if (job.kind === 'direct_message' && job.conversation_id) {
        const { error: stampError } = await db
          .from('dm_conversations')
          .update({ last_notified_at: new Date().toISOString() })
          .eq('id', job.conversation_id)
        if (stampError) console.error('[email-outbox] sent DM notice but could not stamp its window', stampError)
      }
      await finish(db, job.id, true)
      sent += 1
    } catch (jobError) {
      const reason = jobError instanceof Error ? jobError.message : 'Unknown email delivery error'
      console.error('[email-outbox] delivery failed', { jobId: job.id, reason })
      try {
        await finish(db, job.id, false, reason)
      } catch (finishError) {
        console.error('[email-outbox] could not persist retry state', { jobId: job.id, finishError })
      }
    }
  }

  return NextResponse.json({ claimed: jobs.length, sent, deferred })
}
