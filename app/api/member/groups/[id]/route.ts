// app/api/member/groups/[id]/route.ts
// One group: its details, the caller's membership, the most recent 50 messages
// (oldest-first for rendering) and — for owners/moderators — pending requests.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  GROUPS_SETUP_MESSAGE,
  isMissingGroupsTable,
  isSiteAdminProfile,
  loadGroup,
  loadGroupProfiles,
  loadMembership,
  loadProfileForGroups,
  mapGroupMember,
  mapGroupMessage,
  mapGroupSummary,
  markGroupRead,
  type GroupMemberRow,
  type GroupMessageRow,
} from '@/lib/groups/server'
import {
  GROUP_MESSAGE_PAGE_SIZE,
  canModerateGroup,
  canViewGroup,
  countUnread,
} from '@/lib/groups/types'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  const { group, error: groupError } = await loadGroup(supabase, id)
  if (groupError) {
    if (isMissingGroupsTable(groupError)) {
      return NextResponse.json({ message: GROUPS_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    }
    console.error('[member-group] load failed', groupError)
    return NextResponse.json({ message: 'Could not load this group.' }, { status: 500 })
  }
  if (!group) return NextResponse.json({ message: 'This group no longer exists.' }, { status: 404 })

  const [{ membership, error: membershipError }, profile] = await Promise.all([
    loadMembership(supabase, id, user.id),
    loadProfileForGroups(supabase, user.id),
  ])

  if (membershipError) {
    console.error('[member-group] membership load failed', membershipError)
    return NextResponse.json({ message: 'Could not load this group.' }, { status: 500 })
  }

  const view = canViewGroup({
    group,
    membership: membership ? { status: membership.status } : null,
    isSiteAdmin: isSiteAdminProfile(profile),
  })
  if (!view.ok) return NextResponse.json({ message: view.message }, { status: view.status })

  const { data: messageRows, error: messagesError } = await supabase
    .from('member_group_messages')
    .select('*')
    .eq('group_id', id)
    .order('created_at', { ascending: false })
    .limit(GROUP_MESSAGE_PAGE_SIZE)

  if (messagesError) {
    console.error('[member-group] message load failed', messagesError)
    return NextResponse.json({ message: 'Could not load this group.' }, { status: 500 })
  }

  // Newest-first from the index, reversed once here so the client renders
  // oldest-first without re-sorting.
  const messages = ((messageRows ?? []) as GroupMessageRow[]).slice().reverse()

  const isModerator = canModerateGroup(membership?.role, membership?.status)

  let pendingRows: GroupMemberRow[] = []
  if (isModerator || isSiteAdminProfile(profile)) {
    const { data, error } = await supabase
      .from('member_group_members')
      .select('*')
      .eq('group_id', id)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true })
      .limit(100)

    if (error) console.error('[member-group] pending load failed', error)
    else pendingRows = (data ?? []) as GroupMemberRow[]
  }

  const authors = await loadGroupProfiles(supabase, [
    ...messages.map((row) => row.profile_id),
    ...pendingRows.map((row) => row.profile_id),
  ])

  let unreadCount = membership
    ? countUnread(messages.filter((row) => !row.is_deleted), membership.last_read_at)
    : 0

  // Opening the group clears its badge, so report it as already cleared rather
  // than shipping a count the client would have to un-render a moment later.
  if (membership && membership.status !== 'banned') {
    await markGroupRead(supabase, id, user.id)
    unreadCount = 0
  }

  return NextResponse.json({
    group: mapGroupSummary(group, membership, unreadCount),
    messages: messages.map((row) => mapGroupMessage(row, authors.get(row.profile_id), user.id)),
    pendingMembers: pendingRows.map((row) => mapGroupMember(row, authors.get(row.profile_id))),
  })
}
