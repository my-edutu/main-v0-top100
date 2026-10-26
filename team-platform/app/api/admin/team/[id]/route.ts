import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiError, apiAdmin, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const updateSchema = z.object({
  role: z.enum(['agent', 'team_leader', 'super_admin']).optional(),
  status: z.enum(['invited', 'active', 'suspended']).optional(),
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const member = await apiAdmin()
    const { id } = await params
    const payload = updateSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: target, error } = await admin
      .from('team_memberships')
      .select('*')
      .eq('id', id)
      .eq('team_id', member.membership.team_id)
      .maybeSingle()
    if (error) throw new ApiError('Could not load the team member', 500)
    if (!target) throw new ApiError('Team member not found', 404)

    if (target.id === member.membership.id) {
      if (payload.role && payload.role !== target.role) {
        throw new ApiError('You cannot change your own role', 403)
      }
      if (payload.status && payload.status !== target.status) {
        throw new ApiError('You cannot change your own membership status', 403)
      }
    }

    const nextRole = payload.role ?? target.role
    const nextStatus = payload.status ?? target.status
    const removingAdmin =
      target.role === 'super_admin' && (nextRole !== 'super_admin' || nextStatus !== 'active')

    if (removingAdmin) {
      const { count, error: countError } = await admin
        .from('team_memberships')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', member.membership.team_id)
        .eq('role', 'super_admin')
        .eq('status', 'active')
        .neq('id', target.id)
      if (countError) throw new ApiError('Could not verify administrator coverage', 500)
      if (!count) throw new ApiError('At least one active super admin must remain', 409)
    }

    const updates: Record<string, unknown> = {
      role: nextRole,
      status: nextStatus,
      full_name: payload.fullName ?? target.full_name,
      phone: payload.phone !== undefined ? payload.phone || null : target.phone,
    }
    if (nextStatus === 'active' && !target.joined_at) {
      updates.joined_at = new Date().toISOString()
    }

    const { data: updated, error: updateError } = await admin
      .from('team_memberships')
      .update(updates)
      .eq('id', target.id)
      .select('*')
      .single()
    if (updateError) throw new ApiError('Could not update the team member', 500)

    if (target.user_id) {
      const authUpdate: { user_metadata?: Record<string, unknown>; ban_duration?: string } = {
        user_metadata: { full_name: updates.full_name },
      }
      if (nextStatus === 'suspended') authUpdate.ban_duration = '876000h'
      if (nextStatus === 'active' && target.status === 'suspended') authUpdate.ban_duration = 'none'
      const { error: authError } = await admin.auth.admin.updateUserById(target.user_id, authUpdate)
      if (authError) {
        // The membership is authoritative for app access; log the auth mismatch
        // rather than silently claiming everything succeeded.
        await admin.from('team_audit_logs').insert({
          team_id: member.membership.team_id,
          actor_user_id: member.user.id,
          actor_membership_id: member.membership.id,
          action: 'team.auth_sync_failed',
          entity_type: 'membership',
          entity_id: target.id,
          metadata: { error: authError.message, next_status: nextStatus },
        })
      }
    }

    await audit(member, 'team.member_updated', 'membership', target.id, {
      from_role: target.role,
      to_role: nextRole,
      from_status: target.status,
      to_status: nextStatus,
    })

    return NextResponse.json({ member: updated })
  } catch (error) {
    return jsonError(error)
  }
}
