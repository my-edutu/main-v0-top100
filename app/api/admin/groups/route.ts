// app/api/admin/groups/route.ts
// Admin view of every awardee group, including private ones.
//   GET   -> all groups (optionally ?groupId= for that group's recent messages)
//   PATCH -> archive/unarchive a group, or soft-delete a message
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  GROUPS_SETUP_MESSAGE,
  isMissingGroupsTable,
  loadGroupProfiles,
  mapGroupMessage,
  mapGroupSummary,
  type GroupMessageRow,
  type GroupRow,
} from '@/lib/groups/server'

export const runtime = 'nodejs'

const SETUP_RESPONSE = () =>
  NextResponse.json({ message: GROUPS_SETUP_MESSAGE, setupRequired: true }, { status: 503 })

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const groupId = request.nextUrl.searchParams.get('groupId')

  const { data, error } = await supabase
    .from('member_groups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) {
    if (isMissingGroupsTable(error)) return SETUP_RESPONSE()
    console.error('[admin-groups] list failed', error)
    return NextResponse.json({ message: 'Could not load groups.' }, { status: 500 })
  }

  const groups = ((data ?? []) as GroupRow[]).map((row) => mapGroupSummary(row, null, 0))

  if (!groupId) return NextResponse.json({ groups })

  const { data: messageRows, error: messagesError } = await supabase
    .from('member_group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (messagesError) {
    console.error('[admin-groups] message load failed', messagesError)
    return NextResponse.json({ groups, messages: [] })
  }

  const rows = ((messageRows ?? []) as GroupMessageRow[]).slice().reverse()
  const authors = await loadGroupProfiles(supabase, rows.map((row) => row.profile_id))

  return NextResponse.json({
    groups,
    messages: rows.map((row) => mapGroupMessage(row, authors.get(row.profile_id), adminCheck.user?.id ?? '')),
  })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let payload: Record<string, unknown> = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const adminId = adminCheck.user?.id ?? null

  // Soft-delete a single message.
  const messageId = typeof payload.messageId === 'string' ? payload.messageId.trim() : ''
  if (messageId) {
    const { error } = await supabase
      .from('member_group_messages')
      .update({ is_deleted: true, deleted_by: adminId })
      .eq('id', messageId)

    if (error) {
      if (isMissingGroupsTable(error)) return SETUP_RESPONSE()
      console.error('[admin-groups] message delete failed', error)
      return NextResponse.json({ message: 'Could not remove this message.' }, { status: 500 })
    }
    return NextResponse.json({ deleted: true })
  }

  // Archive / unarchive a group.
  const groupId = typeof payload.groupId === 'string' ? payload.groupId.trim() : ''
  if (!groupId) {
    return NextResponse.json({ message: 'Provide a groupId or a messageId.' }, { status: 400 })
  }
  if (typeof payload.isArchived !== 'boolean') {
    return NextResponse.json({ message: 'Provide isArchived as true or false.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('member_groups')
    .update({ is_archived: payload.isArchived })
    .eq('id', groupId)
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingGroupsTable(error)) return SETUP_RESPONSE()
    console.error('[admin-groups] archive failed', error)
    return NextResponse.json({ message: 'Could not update this group.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ message: 'That group no longer exists.' }, { status: 404 })

  return NextResponse.json({ group: mapGroupSummary(data as GroupRow, null, 0) })
}
