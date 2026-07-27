// app/api/member/groups/[id]/messages/route.ts
//   GET    -> a page of 50 messages (?before=<iso> for older), stamps last_read_at
//   POST   -> post a message (gated by assertCanPost)
//   DELETE -> soft-delete one message (?messageId=)
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import {
  GROUPS_SETUP_MESSAGE,
  assertCanPost,
  isMissingGroupsTable,
  isSiteAdminProfile,
  loadGroup,
  loadGroupProfiles,
  loadMembership,
  loadProfileForGroups,
  mapGroupMessage,
  markGroupRead,
  type GroupMessageRow,
} from '@/lib/groups/server'
import {
  GROUP_MESSAGE_PAGE_SIZE,
  canDeleteMessage,
  canViewGroup,
  postGroupMessageSchema,
} from '@/lib/groups/types'

export const runtime = 'nodejs'

const SETUP_RESPONSE = () =>
  NextResponse.json({ message: GROUPS_SETUP_MESSAGE, setupRequired: true }, { status: 503 })

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params
  const before = request.nextUrl.searchParams.get('before')
  const supabase = createAdminClient()

  const { group, error: groupError } = await loadGroup(supabase, id)
  if (groupError) {
    if (isMissingGroupsTable(groupError)) return SETUP_RESPONSE()
    console.error('[group-messages] group load failed', groupError)
    return NextResponse.json({ message: 'Could not load messages.' }, { status: 500 })
  }
  if (!group) return NextResponse.json({ message: 'This group no longer exists.' }, { status: 404 })

  const [{ membership }, profile] = await Promise.all([
    loadMembership(supabase, id, user.id),
    loadProfileForGroups(supabase, user.id),
  ])

  const view = canViewGroup({
    group,
    membership: membership ? { status: membership.status } : null,
    isSiteAdmin: isSiteAdminProfile(profile),
  })
  if (!view.ok) return NextResponse.json({ message: view.message }, { status: view.status })

  // Ask for one more than a page so we can tell the client whether there is
  // older history without a second count query.
  let query = supabase
    .from('member_group_messages')
    .select('*')
    .eq('group_id', id)
    .order('created_at', { ascending: false })
    .limit(GROUP_MESSAGE_PAGE_SIZE + 1)

  if (before) {
    const parsed = new Date(before)
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ message: 'Invalid `before` timestamp.' }, { status: 400 })
    }
    query = query.lt('created_at', parsed.toISOString())
  }

  const { data, error } = await query
  if (error) {
    if (isMissingGroupsTable(error)) return SETUP_RESPONSE()
    console.error('[group-messages] load failed', error)
    return NextResponse.json({ message: 'Could not load messages.' }, { status: 500 })
  }

  const rows = (data ?? []) as GroupMessageRow[]
  const hasMore = rows.length > GROUP_MESSAGE_PAGE_SIZE
  const page = rows.slice(0, GROUP_MESSAGE_PAGE_SIZE).reverse()

  const authors = await loadGroupProfiles(supabase, page.map((row) => row.profile_id))

  if (membership && membership.status !== 'banned') {
    await markGroupRead(supabase, id, user.id)
  }

  return NextResponse.json({
    messages: page.map((row) => mapGroupMessage(row, authors.get(row.profile_id), user.id)),
    hasMore,
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params

  let payload: unknown = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = postGroupMessageSchema.safeParse(payload)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Write something before sending.'
    return NextResponse.json({ message }, { status: 400 })
  }

  const rateLimit = checkRateLimit({
    maxRequests: 30,
    windowSeconds: 60,
    identifier: `group-post:${user.id}`,
  })
  if (!rateLimit.success) {
    return createRateLimitResponse(rateLimit, 'You are posting too quickly. Take a breath.') as NextResponse
  }

  const supabase = createAdminClient()

  const gate = await assertCanPost(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      gate.setupRequired
        ? { message: gate.message, setupRequired: true }
        : { message: gate.message },
      { status: gate.status },
    )
  }

  const { data, error } = await supabase
    .from('member_group_messages')
    .insert({ group_id: id, profile_id: user.id, body: parsed.data.body })
    .select('*')
    .single()

  if (error || !data) {
    console.error('[group-messages] post failed', error)
    return NextResponse.json({ message: 'Could not post your message.' }, { status: 500 })
  }

  // Posting counts as reading everything up to now.
  await markGroupRead(supabase, id, user.id)

  const authors = await loadGroupProfiles(supabase, [user.id])
  return NextResponse.json(
    { message: mapGroupMessage(data as GroupMessageRow, authors.get(user.id), user.id) },
    { status: 201 },
  )
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params
  const messageId = request.nextUrl.searchParams.get('messageId')
  if (!messageId) {
    return NextResponse.json({ message: 'Which message should be removed?' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('member_group_messages')
    .select('*')
    .eq('id', messageId)
    .eq('group_id', id)
    .maybeSingle()

  if (error) {
    if (isMissingGroupsTable(error)) return SETUP_RESPONSE()
    console.error('[group-messages] delete lookup failed', error)
    return NextResponse.json({ message: 'Could not remove this message.' }, { status: 500 })
  }

  const [{ membership }, profile] = await Promise.all([
    loadMembership(supabase, id, user.id),
    loadProfileForGroups(supabase, user.id),
  ])

  const verdict = canDeleteMessage({
    message: row ? { authorId: (row as GroupMessageRow).profile_id } : null,
    viewerId: user.id,
    membership: membership ? { role: membership.role, status: membership.status } : null,
    isSiteAdmin: isSiteAdminProfile(profile),
  })
  if (!verdict.ok) return NextResponse.json({ message: verdict.message }, { status: verdict.status })

  // Soft-delete only: the row stays so moderation remains auditable.
  const { error: updateError } = await supabase
    .from('member_group_messages')
    .update({ is_deleted: true, deleted_by: user.id })
    .eq('id', messageId)
    .eq('group_id', id)

  if (updateError) {
    console.error('[group-messages] soft delete failed', updateError)
    return NextResponse.json({ message: 'Could not remove this message.' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
