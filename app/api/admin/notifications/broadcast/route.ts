// app/api/admin/notifications/broadcast/route.ts
// Admin: broadcast a dashboard notification to members by fanning out one
// user_notifications row per targeted member. A shared broadcast_id in
// metadata lets us group them back into one "sent" entry.
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { sanitizeInput } from '@/lib/security'

export const runtime = 'nodejs'

type BroadcastRow = { title: string; body: string; delivered_at: string; metadata: any }

// GET — recent broadcasts, grouped by broadcast_id, newest first.
export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_notifications')
    .select('title, body, delivered_at, metadata')
    .eq('category', 'admin')
    .order('delivered_at', { ascending: false })
    .limit(300)

  if (error) return NextResponse.json({ message: 'Could not load notifications.' }, { status: 500 })

  const groups = new Map<string, { id: string; title: string; message: string; audience: string; createdAt: string; recipients: number }>()
  for (const row of (data ?? []) as BroadcastRow[]) {
    const meta = row.metadata ?? {}
    const key = meta.broadcast_id ?? `${row.title}|${row.delivered_at}`
    const existing = groups.get(key)
    if (existing) {
      existing.recipients += 1
    } else {
      groups.set(key, {
        id: key,
        title: row.title,
        message: row.body,
        audience: meta.audience === 'approved' ? 'approved' : 'all',
        createdAt: row.delivered_at,
        recipients: 1,
      })
    }
  }

  return NextResponse.json({ notifications: Array.from(groups.values()).slice(0, 12) })
}

// POST — send a broadcast to all members or approved members only.
export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const title = sanitizeInput(String(body.title ?? ''))
  const message = sanitizeInput(String(body.message ?? ''))
  const audience = body.audience === 'approved' ? 'approved' : 'all'

  if (!title || !message) {
    return NextResponse.json({ message: 'Add a title and message before sending.' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Resolve the target audience.
  let query = supabase.from('profiles').select('id').eq('role', 'user')
  if (audience === 'approved') query = query.eq('membership_status', 'approved')
  const { data: targets, error: targetError } = await query

  if (targetError) return NextResponse.json({ message: 'Could not resolve recipients.' }, { status: 500 })
  if (!targets || targets.length === 0) {
    return NextResponse.json({ message: 'No matching members to notify.', recipients: 0 }, { status: 200 })
  }

  const broadcastId = randomUUID()
  const deliveredAt = new Date().toISOString()
  const rows = targets.map((t: { id: string }) => ({
    user_id: t.id,
    title,
    body: message,
    category: 'admin',
    delivered_at: deliveredAt,
    metadata: { audience, broadcast_id: broadcastId },
  }))

  const { error: insertError } = await supabase.from('user_notifications').insert(rows)
  if (insertError) {
    return NextResponse.json({ message: 'Could not send the notification.' }, { status: 500 })
  }

  return NextResponse.json({ recipients: rows.length, broadcastId }, { status: 201 })
}
