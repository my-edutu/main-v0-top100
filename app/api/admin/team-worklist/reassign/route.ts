import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const schema = z.object({
  teamId: z.string().uuid(),
  awardeeId: z.string().uuid(),
  agentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
})

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { message: 'Choose a sales rep and enter a reason (3–500 characters).' },
      { status: 400 },
    )
  const { data, error } = await createAdminClient().rpc(
    'team_reassign_awardee',
    {
      p_team_id: parsed.data.teamId,
      p_awardee_id: parsed.data.awardeeId,
      p_new_agent_id: parsed.data.agentId,
      p_actor: auth.user.id,
      p_reason: parsed.data.reason,
    },
  )
  if (error)
    return NextResponse.json({ message: error.message }, { status: 400 })
  return NextResponse.json({ result: data })
}
