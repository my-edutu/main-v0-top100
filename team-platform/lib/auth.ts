import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createServerSupabase } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Membership, Role, SessionMember, Team } from '@/lib/types'

type MembershipRow = Membership & { team_teams: Team | Team[] | null }

function unwrapTeam(row: MembershipRow): Team | null {
  if (!row.team_teams) return null
  return Array.isArray(row.team_teams) ? (row.team_teams[0] ?? null) : row.team_teams
}

export const getSessionMember = cache(async (): Promise<SessionMember | null> => {
  const supabase = await createServerSupabase()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user?.email) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('team_memberships')
    .select('*, team_teams(*)')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return null
  const row = data as MembershipRow
  const team = unwrapTeam(row)
  if (!team || row.status !== 'active') return null

  return {
    user: { id: user.id, email: user.email },
    membership: {
      id: row.id,
      team_id: row.team_id,
      user_id: row.user_id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      status: row.status,
      phone: row.phone,
      joined_at: row.joined_at,
    },
    team,
  }
})

export const getSuspendedMembership = cache(async () => {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('team_memberships')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'suspended')
    .maybeSingle()
  return data ? 'suspended' : null
})

export async function requireMember(): Promise<SessionMember> {
  const member = await getSessionMember()
  if (!member) redirect('/login')
  return member
}

export async function requireAdmin(): Promise<SessionMember> {
  const member = await requireMember()
  if (member.membership.role !== 'super_admin') redirect('/dashboard?denied=admin')
  return member
}

export async function requireStaff(): Promise<SessionMember> {
  const member = await requireMember()
  if (!member.membership.role || !['super_admin', 'team_leader'].includes(member.membership.role)) {
    redirect('/dashboard?denied=staff')
  }
  return member
}

export function isAdmin(role: Role | string | null | undefined) {
  return role === 'super_admin'
}

export function isStaff(role: Role | string | null | undefined) {
  return role === 'super_admin' || role === 'team_leader'
}

export async function signOut() {
  const supabase = await createServerSupabase()
  await supabase.auth.signOut()
  redirect('/login')
}
