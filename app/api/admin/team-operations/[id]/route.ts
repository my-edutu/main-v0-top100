import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  role: z.enum(['agent', 'team_leader']).optional(),
  status: z.enum(['invited', 'active', 'suspended']).optional(),
}).refine((value) => Object.keys(value).length > 0)

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const parsed = updateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Choose a valid role or status.' }, { status: 400 })

  const { id } = await params
  const admin = createAdminClient()
  const { data: target, error: readError } = await admin
    .from('team_memberships')
    .select('id,team_id,user_id,role,status,joined_at')
    .eq('id', id)
    .maybeSingle()
  if (readError) return NextResponse.json({ message: 'Could not load this team member.' }, { status: 500 })
  if (!target) return NextResponse.json({ message: 'Team member not found.' }, { status: 404 })

  if (target.user_id === auth.user.id) {
    return NextResponse.json({ message: 'You cannot change your own team access here.' }, { status: 403 })
  }

  // A Top100 administrator's membership mirrors their platform role and is
  // managed through Top100 user administration, not team role assignment.
  if (target.role === 'super_admin') {
    return NextResponse.json({ message: 'Top100 administrator access is managed by the platform.' }, { status: 403 })
  }

  const updates: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === 'active' && !target.joined_at) updates.joined_at = new Date().toISOString()
  const { error: updateError } = await admin
    .from('team_memberships')
    .update(updates)
    .eq('id', id)
  if (updateError) {
    console.error('[team-operations] Membership update failed', updateError.message)
    return NextResponse.json({ message: 'Could not update team access.' }, { status: 500 })
  }

  const { data: actorMembership } = await admin
    .from('team_memberships')
    .select('id')
    .eq('team_id', target.team_id)
    .eq('user_id', auth.user.id)
    .maybeSingle()
  const { error: auditError } = await admin.from('team_audit_logs').insert({
    team_id: target.team_id,
    actor_user_id: auth.user.id,
    actor_membership_id: actorMembership?.id ?? null,
    action: 'team.member_updated',
    entity_type: 'membership',
    entity_id: id,
    metadata: {
      from_role: target.role,
      to_role: parsed.data.role ?? target.role,
      from_status: target.status,
      to_status: parsed.data.status ?? target.status,
    },
  })
  if (auditError) console.error('[team-operations] Could not record audit event', auditError.message)

  return NextResponse.json({ ok: true })
}
