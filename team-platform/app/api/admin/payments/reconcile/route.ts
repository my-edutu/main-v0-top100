import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const body = await request.json().catch(() => ({}))
    const limit = Math.min(Math.max(Number(body?.limit) || 500, 1), 2000)
    const admin = createAdminClient()

    const { data, error } = await admin.rpc('team_reconcile_payments', {
      p_team_id: member.membership.team_id,
      p_actor: member.user.id,
      p_limit: limit,
    })
    if (error) throw new ApiError(error.message, 400)

    return NextResponse.json({ result: data })
  } catch (error) {
    return jsonError(error)
  }
}
