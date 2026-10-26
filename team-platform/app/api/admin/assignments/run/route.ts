import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { assignmentSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = assignmentSchema.parse(await request.json().catch(() => ({})))
    const admin = createAdminClient()

    const { data, error } = await admin.rpc('team_auto_assign', {
      p_team_id: member.membership.team_id,
      p_actor: member.user.id,
      p_limit: payload.limit,
      p_country: payload.country || null,
      p_include_pending: payload.includePending,
    })
    if (error) {
      if (/automatic assignment is paused/i.test(error.message)) {
        throw new ApiError('Automatic assignment is paused. Enable it in Settings first.', 409)
      }
      if (/no agent/i.test(error.message)) {
        throw new ApiError('There are no active sales agents to assign awardees to.', 409)
      }
      throw new ApiError(error.message, 400)
    }

    return NextResponse.json({ result: data })
  } catch (error) {
    return jsonError(error)
  }
}
