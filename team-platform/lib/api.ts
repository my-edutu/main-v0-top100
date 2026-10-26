import { NextResponse } from 'next/server'
import { getSessionMember } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role, SessionMember } from '@/lib/types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export async function apiMember(): Promise<SessionMember> {
  const member = await getSessionMember()
  if (!member) throw new ApiError('Authentication required', 401)
  return member
}

export async function apiAdmin(): Promise<SessionMember> {
  const member = await apiMember()
  if (member.membership.role !== 'super_admin') throw new ApiError('Administrator access required', 403)
  return member
}

export async function apiStaff(): Promise<SessionMember> {
  const member = await apiMember()
  if (!['super_admin', 'team_leader'].includes(member.membership.role)) {
    throw new ApiError('Team staff access required', 403)
  }
  return member
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : 'Something went wrong'
  const safe =
    /duplicate key|unique constraint/i.test(message)
      ? 'That record already exists.'
      : /row-level security|permission denied/i.test(message)
        ? 'You do not have permission to do that.'
        : /available balance|exceeds/i.test(message)
          ? message
          : 'The request could not be completed.'
  if (process.env.NODE_ENV !== 'production') {
    console.error('[team-platform api]', error)
  }
  return NextResponse.json({ error: safe }, { status: 400 })
}

export async function audit(
  member: SessionMember,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const admin = createAdminClient()
  await admin.from('team_audit_logs').insert({
    team_id: member.membership.team_id,
    actor_user_id: member.user.id,
    actor_membership_id: member.membership.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  })
}

export async function assertAgentOwnsAwardee(
  member: SessionMember,
  awardeeId: string,
): Promise<{ assignmentId: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_assignments')
    .select('id, awardee_id, agent_id, status')
    .eq('awardee_id', awardeeId)
    .eq('status', 'active')
    .maybeSingle()
  if (error) throw new ApiError('Could not verify awardee access', 500)
  if (!data || data.agent_id !== member.membership.id) {
    throw new ApiError('This awardee is not assigned to you', 403)
  }
  return { assignmentId: data.id }
}

export function hasRole(member: SessionMember, roles: Role[]) {
  return roles.includes(member.membership.role)
}
