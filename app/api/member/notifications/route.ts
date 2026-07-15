// app/api/member/notifications/route.ts
// The authenticated member marks one of their notifications as read.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const notificationId = String(body.notificationId ?? '')
  if (!notificationId) return NextResponse.json({ message: 'notificationId is required.' }, { status: 400 })

  const supabase = createAdminClient()
  // Scope the update to the caller's own notification row.
  const { error } = await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ message: 'Could not mark this notification as read.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
