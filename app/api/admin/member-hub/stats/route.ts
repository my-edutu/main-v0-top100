import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const [members, pendingFeatures, recentNotifications] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    supabase.from('member_features').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('user_notifications').select('title,delivered_at,metadata').eq('category', 'admin').order('delivered_at', { ascending: false }).limit(300),
  ])

  if (members.error || pendingFeatures.error || recentNotifications.error) {
    console.error('[admin/member-hub/stats] Could not load summary counts', {
      members: members.error?.code,
      pendingFeatures: pendingFeatures.error?.code,
      notifications: recentNotifications.error?.code,
    })
    return NextResponse.json({ message: 'Could not load member hub totals.' }, { status: 500 })
  }

  const notificationIds = new Set((recentNotifications.data ?? []).map((row) => {
    const metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {}
    return typeof metadata.broadcast_id === 'string'
      ? metadata.broadcast_id
      : `${row.title}|${row.delivered_at}`
  }))

  return NextResponse.json({
    members: members.count ?? 0,
    pendingFeatures: pendingFeatures.count ?? 0,
    notifications: notificationIds.size,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
