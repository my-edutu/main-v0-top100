import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { reassignSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = reassignSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: awardee, error } = await admin
      .from('team_awardees')
      .select('id')
      .eq('id', payload.awardeeId)
      .eq('team_id', member.membership.team_id)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw new ApiError('Could not verify awardee', 500)
    if (!awardee) throw new ApiError('Awardee not found', 404)

    const { data, error: rpcError } = await admin.rpc('team_reassign_awardee', {
      p_team_id: member.membership.team_id,
      p_actor: member.user.id,
      p_awardee_id: payload.awardeeId,
      p_new_agent_id: payload.agentId,
      p_reason: payload.reason,
    })
    if (rpcError) throw new ApiError(rpcError.message, 400)

    return NextResponse.json({ result: data })
  } catch (error) {
    return jsonError(error)
  }
}
