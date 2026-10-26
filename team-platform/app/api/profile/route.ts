import { NextResponse } from 'next/server'
import { ApiError, apiMember, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { profileSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request) {
  try {
    const member = await apiMember()
    const payload = profileSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('team_memberships')
      .update({ full_name: payload.fullName, phone: payload.phone || null })
      .eq('id', member.membership.id)
      .eq('team_id', member.membership.team_id)
      .select('id, full_name, phone')
      .single()
    if (error) throw new ApiError('Could not update your profile', 500)

    await Promise.allSettled([
      admin.auth.admin.updateUserById(member.user.id, {
        user_metadata: { full_name: payload.fullName, phone: payload.phone || null },
      }),
      audit(member, 'profile.updated', 'membership', member.membership.id, {
        full_name: payload.fullName,
      }),
    ])

    return NextResponse.json({ member: data })
  } catch (error) {
    return jsonError(error)
  }
}
