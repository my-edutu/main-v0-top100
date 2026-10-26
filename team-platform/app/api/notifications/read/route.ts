import { NextResponse } from 'next/server'
import { ApiError, apiMember, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { notificationReadSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const member = await apiMember()
    const payload = notificationReadSchema.parse(await request.json().catch(() => ({})))
    const admin = createAdminClient()

    let query = admin
      .from('team_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', member.user.id)
      .is('read_at', null)
    if (!payload.all && payload.ids?.length) query = query.in('id', payload.ids)

    const { data, error } = await query.select('id')
    if (error) throw new ApiError('Could not update notifications', 500)

    return NextResponse.json({ updated: data?.length ?? 0 })
  } catch (error) {
    return jsonError(error)
  }
}
