import { NextResponse } from 'next/server'
import { ApiError, apiMember, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { followupSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const member = await apiMember()
    if (member.membership.role === 'team_leader') {
      throw new ApiError('Team leaders have read-only access to follow-up records', 403)
    }
    const payload = followupSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: awardee, error: awardeeError } = await admin
      .from('team_awardees')
      .select('id, team_id, name, payment_status')
      .eq('id', payload.awardeeId)
      .eq('team_id', member.membership.team_id)
      .eq('is_active', true)
      .maybeSingle()
    if (awardeeError) throw new ApiError('Could not verify awardee', 500)
    if (!awardee) throw new ApiError('Awardee not found', 404)

    const { data: assignment, error: assignmentError } = await admin
      .from('team_assignments')
      .select('id, agent_id')
      .eq('awardee_id', awardee.id)
      .eq('status', 'active')
      .maybeSingle()
    if (assignmentError) throw new ApiError('Could not verify assignment', 500)

    if (member.membership.role === 'agent') {
      if (!assignment || assignment.agent_id !== member.membership.id) {
        throw new ApiError('This awardee is not assigned to you', 403)
      }
    }

    const contactedAt = payload.contactedAt ? new Date(payload.contactedAt) : new Date()
    if (Number.isNaN(contactedAt.getTime())) throw new ApiError('Contact time is invalid')
    if (contactedAt.getTime() > Date.now() + 5 * 60_000) {
      throw new ApiError('Contact time cannot be in the future')
    }
    if (contactedAt.getTime() < Date.now() - 366 * 24 * 60 * 60_000) {
      throw new ApiError('Contact time is too far in the past')
    }

    const { data, error } = await admin
      .from('team_followups')
      .insert({
        team_id: member.membership.team_id,
        assignment_id: assignment?.id ?? null,
        awardee_id: awardee.id,
        agent_id: member.membership.id,
        channel: payload.channel,
        outcome: payload.outcome,
        notes: payload.notes || null,
        responded: payload.responded,
        payment_expected: payload.paymentExpected,
        contacted_at: contactedAt.toISOString(),
        next_followup_at: payload.nextFollowupAt || null,
      })
      .select('*')
      .single()
    if (error) throw new ApiError(error.message, 500)

    await Promise.allSettled([
      audit(member, 'followup.recorded', 'awardee', awardee.id, {
        followup_id: data.id,
        channel: payload.channel,
        outcome: payload.outcome,
        responded: payload.responded,
        payment_expected: payload.paymentExpected,
      }),
      admin.from('team_notifications').insert({
        team_id: member.membership.team_id,
        user_id: member.user.id,
        membership_id: member.membership.id,
        type: 'followup_logged',
        title: 'Follow-up recorded',
        body: `${awardee.name}: ${payload.channel} · ${payload.outcome.replace(/_/g, ' ')}`,
        link: `/awardees/${awardee.id}`,
      }),
    ])

    return NextResponse.json(
      {
        followup: data,
        // This endpoint never changes payment status. Verified payments are the
        // only source of truth, so the UI must never imply that a call did.
        paymentStatus: awardee.payment_status,
      },
      { status: 201 },
    )
  } catch (error) {
    return jsonError(error)
  }
}
