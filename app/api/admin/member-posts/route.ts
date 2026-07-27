// app/api/admin/member-posts/route.ts
// Admin moderation of member-authored posts.
//   GET   -> every member post + its author, optionally filtered by status
//   PATCH -> publish / flag / remove one, with a note, recording who did it
//
// The model is publish-immediately, moderate-after: nothing here gates a
// member's first publish, it only reacts to what is already live.
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  MEMBER_POSTS_SETUP_MESSAGE,
  isMissingMemberPostsTable,
  mapMemberPostWithAuthor,
} from '@/lib/member-posts/server'
import {
  MEMBER_POST_STATUSES,
  canSetStatus,
  moderateMemberPostSchema,
  nextPublishedAt,
  type MemberPostStatus,
} from '@/lib/member-posts/types'

export const runtime = 'nodejs'

const AUTHOR_SELECT = '*, profiles!member_posts_profile_id_fkey(full_name, email, slug)'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const statusParam = request.nextUrl.searchParams.get('status')
  const status =
    statusParam && MEMBER_POST_STATUSES.includes(statusParam as MemberPostStatus)
      ? (statusParam as MemberPostStatus)
      : null

  const supabase = createAdminClient()
  let query = supabase.from('member_posts').select(AUTHOR_SELECT).order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    if (isMissingMemberPostsTable(error)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[admin-member-posts] Failed to load posts:', error)
    return NextResponse.json({ message: 'Could not load member posts.' }, { status: 500 })
  }

  return NextResponse.json({ posts: (data ?? []).map(mapMemberPostWithAuthor) })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const adminId: string | null = adminCheck.user?.id ?? null

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = moderateMemberPostSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || 'Please check the moderation details.' },
      { status: 400 },
    )
  }
  const { postId, status, moderationNote } = parsed.data

  const supabase = createAdminClient()
  const { data: existing, error: lookupError } = await supabase
    .from('member_posts')
    .select('*')
    .eq('id', postId)
    .maybeSingle()

  if (lookupError) {
    if (isMissingMemberPostsTable(lookupError)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[admin-member-posts] Failed to look up post:', lookupError)
    return NextResponse.json({ message: 'Could not look up this post.' }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ message: 'Post not found.' }, { status: 404 })

  const currentStatus = (existing.status ?? 'draft') as MemberPostStatus
  if (!canSetStatus('admin', currentStatus, status)) {
    return NextResponse.json({ message: 'You cannot set that status.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('member_posts')
    .update({
      status,
      // An empty note clears a stale one rather than being ignored.
      moderation_note: moderationNote !== undefined ? moderationNote || null : existing.moderation_note ?? null,
      moderated_by: adminId,
      // An admin publishing a post that was never live still needs a
      // published_at — the table's own check constraint requires it.
      published_at: nextPublishedAt(existing.published_at ?? null, status),
    })
    .eq('id', postId)
    .select(AUTHOR_SELECT)
    .single()

  if (error) {
    console.error('[admin-member-posts] Failed to moderate post:', error)
    return NextResponse.json({ message: 'Could not update this post.' }, { status: 500 })
  }

  return NextResponse.json({ post: mapMemberPostWithAuthor(data) })
}
