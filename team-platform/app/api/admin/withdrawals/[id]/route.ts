import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { withdrawalTransitionSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await apiAdmin()
    const { id } = await params
    const payload = withdrawalTransitionSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: row, error } = await admin
      .from('team_withdrawal_requests')
      .select('id, team_id, agent_id, amount_minor, currency, status')
      .eq('id', id)
      .eq('team_id', member.membership.team_id)
      .maybeSingle()
    if (error) throw new ApiError('Could not load withdrawal', 500)
    if (!row) throw new ApiError('Withdrawal not found', 404)

    if (
      row.agent_id === member.membership.id &&
      ['review', 'approve', 'process', 'pay'].includes(payload.action)
    ) {
      throw new ApiError('You cannot review, approve or pay your own withdrawal', 403)
    }

    if (payload.action === 'pay') {
      if (!payload.reference) throw new ApiError('A transaction reference is required')
      if (!payload.paidAmountMinor) throw new ApiError('The paid amount is required')
    }

    const { data, error: rpcError } = await admin.rpc('team_transition_withdrawal', {
      p_request_id: row.id,
      p_actor: member.user.id,
      p_action: payload.action,
      p_note: payload.note || null,
      p_reference: payload.reference || null,
      p_paid_amount_minor: payload.action === 'pay' ? payload.paidAmountMinor : null,
    })
    if (rpcError) throw new ApiError(rpcError.message, 400)

    return NextResponse.json({ result: data })
  } catch (error) {
    return jsonError(error)
  }
}
