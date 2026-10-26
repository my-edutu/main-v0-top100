import { NextResponse } from 'next/server'
import { ApiError, apiMember, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { withdrawalSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const member = await apiMember()
    if (member.membership.role !== 'agent' && member.membership.role !== 'super_admin') {
      throw new ApiError('Only agents and platform administrators can request a commission withdrawal', 403)
    }
    const payload = withdrawalSchema.parse(await request.json())
    const admin = createAdminClient()

    // The database function is the only authority on the available balance.
    const { data, error } = await admin.rpc('team_request_withdrawal', {
      p_team_id: member.membership.team_id,
      p_actor: member.user.id,
      p_amount_minor: payload.amountMinor,
      p_currency: payload.currency,
      p_payout_method: payload.payoutMethod,
      p_payout_details: payload.payoutDetails,
      p_idempotency_key: payload.idempotencyKey,
    })
    if (error) throw new ApiError(error.message, 400)

    return NextResponse.json({ result: data }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
