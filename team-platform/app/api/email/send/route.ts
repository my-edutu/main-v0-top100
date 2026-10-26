import { NextResponse } from 'next/server'
import { ApiError, apiMember, audit, jsonError } from '@/lib/api'
import { sendEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'
import { emailSendSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const member = await apiMember()
    if (member.membership.role === 'team_leader') {
      throw new ApiError('Team leaders have read-only access to outbound email', 403)
    }
    const payload = emailSendSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: awardee, error: awardeeError } = await admin
      .from('team_awardees')
      .select('id, team_id, name, email')
      .eq('id', payload.awardeeId)
      .eq('team_id', member.membership.team_id)
      .eq('is_active', true)
      .maybeSingle()
    if (awardeeError) throw new ApiError('Could not verify awardee', 500)
    if (!awardee) throw new ApiError('Awardee not found', 404)

    if (member.membership.role === 'agent') {
      const { data: assignment } = await admin
        .from('team_assignments')
        .select('id, agent_id')
        .eq('awardee_id', awardee.id)
        .eq('status', 'active')
        .maybeSingle()
      if (!assignment || assignment.agent_id !== member.membership.id) {
        throw new ApiError('This awardee is not assigned to you', 403)
      }
    }

    if (!awardee.email) throw new ApiError('This awardee has no email address on file')

    const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString()
    const { count } = await admin
      .from('team_email_logs')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', member.membership.team_id)
      .eq('agent_id', member.membership.id)
      .gte('attempted_at', hourAgo)
    if ((count ?? 0) >= 80) {
      throw new ApiError('Hourly email limit reached. Try again later.', 429)
    }

    const { data: existing, error: existingError } = await admin
      .from('team_email_logs')
      .select('*')
      .eq('team_id', member.membership.team_id)
      .eq('idempotency_key', payload.idempotencyKey)
      .maybeSingle()
    if (existingError) throw new ApiError('Could not check email idempotency', 500)

    if (existing?.status === 'sent') {
      return NextResponse.json({
        duplicate: true,
        logId: existing.id,
        messageId: existing.provider_message_id,
        status: 'sent',
      })
    }
    if (existing?.status === 'queued') {
      throw new ApiError('This email is already being sent', 409)
    }

    let logId: string
    if (existing?.status === 'failed') {
      // Retrying with the same key is allowed, but only one caller may claim
      // the failed attempt at a time.
      const { data: claimed, error: claimError } = await admin
        .from('team_email_logs')
        .update({
          status: 'queued',
          error: null,
          attempted_at: new Date().toISOString(),
          subject: payload.subject,
          body: payload.body,
          template_id: payload.templateId ?? null,
        })
        .eq('id', existing.id)
        .eq('status', 'failed')
        .select('id')
        .maybeSingle()
      if (claimError) throw new ApiError('Could not retry this email', 500)
      if (!claimed) throw new ApiError('This email is already being retried', 409)
      logId = claimed.id
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('team_email_logs')
        .insert({
          team_id: member.membership.team_id,
          awardee_id: awardee.id,
          agent_id: member.membership.id,
          template_id: payload.templateId ?? null,
          to_email: awardee.email,
          subject: payload.subject,
          body: payload.body,
          status: 'queued',
          idempotency_key: payload.idempotencyKey,
        })
        .select('id')
        .single()
      if (insertError?.code === '23505') {
        throw new ApiError('This email request was already submitted', 409)
      }
      if (insertError) throw new ApiError(insertError.message, 500)
      logId = inserted.id
    }

    const { data: settings } = await admin
      .from('team_settings')
      .select('sender_name, sender_email')
      .eq('team_id', member.membership.team_id)
      .maybeSingle()

    const result = await sendEmail({
      to: awardee.email,
      subject: payload.subject,
      text: payload.body,
      replyTo: member.user.email,
      fromName: settings?.sender_name ?? undefined,
      fromEmail: settings?.sender_email || undefined,
    })

    const attemptedAt = new Date().toISOString()
    if (result.ok) {
      await admin
        .from('team_email_logs')
        .update({
          status: 'sent',
          provider_message_id: result.messageId,
          provider_response: {
            response: result.response,
            accepted: result.accepted,
            rejected: result.rejected,
          },
          sent_at: attemptedAt,
        })
        .eq('id', logId)
    } else {
      await admin
        .from('team_email_logs')
        .update({ status: 'failed', error: result.error.slice(0, 500) })
        .eq('id', logId)
    }

    // The email attempt is part of the awardee timeline. A failure is recorded
    // as a failure — never as a successful contact.
    await admin.from('team_followups').insert({
      team_id: member.membership.team_id,
      awardee_id: awardee.id,
      agent_id: member.membership.id,
      channel: 'email',
      outcome: result.ok ? 'email_sent' : 'email_failed',
      notes: `${payload.subject}${result.ok ? '' : ` — ${result.error}`}`.slice(0, 4000),
      contacted_at: attemptedAt,
      email_log_id: logId,
    })

    await audit(member, result.ok ? 'email.sent' : 'email.failed', 'awardee', awardee.id, {
      log_id: logId,
      to: awardee.email,
      subject: payload.subject,
      provider_message_id: result.ok ? result.messageId : null,
      error: result.ok ? null : result.error,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          logId,
          status: 'failed',
          configured: result.code !== 'SMTP_NOT_CONFIGURED',
        },
        { status: result.code === 'SMTP_NOT_CONFIGURED' ? 503 : 502 },
      )
    }

    return NextResponse.json({
      logId,
      messageId: result.messageId,
      status: 'sent',
      recipient: awardee.email,
    })
  } catch (error) {
    return jsonError(error)
  }
}
