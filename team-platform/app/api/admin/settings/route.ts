import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { settingsSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = settingsSchema.parse(await request.json())
    if (payload.withdrawalMaxMinor > 0 && payload.withdrawalMaxMinor < payload.withdrawalMinMinor) {
      throw new ApiError('The maximum withdrawal must be zero (no cap) or at least the minimum')
    }
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('team_settings')
      .update({
        assignment_strategy: payload.assignmentStrategy,
        auto_assign_enabled: payload.autoAssignEnabled,
        default_country: payload.defaultCountry,
        withdrawal_min_minor: payload.withdrawalMinMinor,
        withdrawal_max_minor: payload.withdrawalMaxMinor,
        commission_hold_hours: payload.commissionHoldHours,
        sender_name: payload.senderName,
        sender_email: payload.senderEmail || null,
        updated_by: member.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('team_id', member.membership.team_id)
      .select('*')
      .single()
    if (error) throw new ApiError(`Could not save settings: ${error.message}`, 500)

    await audit(member, 'settings.updated', 'team', member.membership.team_id, payload)
    return NextResponse.json({ settings: data })
  } catch (error) {
    return jsonError(error)
  }
}
