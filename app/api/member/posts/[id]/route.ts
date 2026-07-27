// app/api/member/posts/[id]/route.ts
//   PATCH  -> update one of the caller's own posts
//   DELETE -> hard-delete one of the caller's own posts
//
// A `removed` post is refused by both: it is a moderation record, not the
// member's content any more, and letting the author delete it would erase the
// only evidence that a removal happened.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  MEMBER_POSTS_SETUP_MESSAGE,
  MEMBERSHIP_SETUP_MESSAGE,
  isMissingMemberPostsTable,
  loadMembershipStatus,
  loadOwnPost,
  loadSlugsForAuthor,
  mapMemberPost,
} from '@/lib/member-posts/server'
import {
  PUBLISH_REQUIRES_APPROVAL_MESSAGE,
  REMOVED_POST_MESSAGE,
  canPublish,
  canSetStatus,
  memberCanMutate,
  nextPublishedAt,
  shouldReslug,
  slugifyTitle,
  uniquifySlug,
  updateMemberPostSchema,
  type MemberPostStatus,
} from '@/lib/member-posts/types'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await context.params

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = updateMemberPostSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || 'Please check the post details.' },
      { status: 400 },
    )
  }
  const input = parsed.data

  const supabase = createAdminClient()
  const { row, error: lookupError } = await loadOwnPost(supabase, id, user.id)

  if (lookupError) {
    if (isMissingMemberPostsTable(lookupError)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[member-posts] Failed to look up post:', lookupError)
    return NextResponse.json({ message: 'Could not load this post.' }, { status: 500 })
  }
  if (!row) return NextResponse.json({ message: 'Post not found.' }, { status: 404 })

  const currentStatus = (row.status ?? 'draft') as MemberPostStatus

  // A removed post is frozen for its author, whatever the payload says.
  if (!memberCanMutate(currentStatus)) {
    return NextResponse.json({ message: REMOVED_POST_MESSAGE }, { status: 403 })
  }

  const nextStatus = input.status ?? currentStatus
  if (input.status && !canSetStatus('member', currentStatus, input.status)) {
    return NextResponse.json({ message: 'You cannot set that status.' }, { status: 403 })
  }

  if (nextStatus === 'published' && currentStatus !== 'published') {
    const membership = await loadMembershipStatus(supabase, user.id)
    if (membership.columnMissing) {
      return NextResponse.json({ message: MEMBERSHIP_SETUP_MESSAGE }, { status: 503 })
    }
    if (membership.error) {
      console.error('[member-posts] Failed to read membership status:', membership.error)
      return NextResponse.json({ message: 'Could not check your membership.' }, { status: 500 })
    }
    if (!canPublish(membership.status)) {
      return NextResponse.json({ message: PUBLISH_REQUIRES_APPROVAL_MESSAGE }, { status: 403 })
    }
  }

  const columns: Record<string, unknown> = {}
  if (input.title !== undefined) columns.title = input.title
  if (input.body !== undefined) columns.body = input.body
  if (input.excerpt !== undefined) columns.excerpt = input.excerpt
  if (input.coverUrl !== undefined) columns.cover_url = input.coverUrl
  if (input.tags !== undefined) columns.tags = input.tags
  if (input.status !== undefined) columns.status = input.status

  // Re-slug only for a title change on a post that has never been published.
  // Re-slugging a live post silently breaks its public URL and every link
  // anyone has already shared.
  const titleChanged = input.title !== undefined && input.title !== row.title
  if (shouldReslug({ titleChanged, publishedAt: row.published_at ?? null })) {
    const { slugs, error: slugError } = await loadSlugsForAuthor(supabase, user.id)
    if (slugError) {
      console.error('[member-posts] Failed to load existing slugs:', slugError)
      return NextResponse.json({ message: 'Could not update this post.' }, { status: 500 })
    }
    const others = slugs.filter((slug) => slug !== row.slug)
    columns.slug = uniquifySlug(slugifyTitle(input.title as string), others)
  }

  // Set once, on the first publish, and never moved again — so re-publishing a
  // flagged post keeps its original date.
  const publishedAt = nextPublishedAt(row.published_at ?? null, nextStatus)
  if (publishedAt !== (row.published_at ?? null)) columns.published_at = publishedAt

  // A member editing a flagged post clears the note along with the flag, so
  // they are not left staring at a warning they have already acted on.
  if (input.status === 'draft' || input.status === 'published') {
    if (currentStatus === 'flagged') columns.moderation_note = null
  }

  if (Object.keys(columns).length === 0) {
    return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('member_posts')
    .update(columns)
    .eq('id', id)
    // Re-assert ownership and the not-removed guard in the write itself, so a
    // moderation action that lands between the read above and this update
    // cannot be overwritten.
    .eq('profile_id', user.id)
    .neq('status', 'removed')
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingMemberPostsTable(error)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[member-posts] Failed to update post:', error)
    return NextResponse.json({ message: 'Could not update this post.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ message: REMOVED_POST_MESSAGE }, { status: 403 })
  }

  return NextResponse.json({ post: mapMemberPost(data) })
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await context.params
  const supabase = createAdminClient()

  const { row, error: lookupError } = await loadOwnPost(supabase, id, user.id)
  if (lookupError) {
    if (isMissingMemberPostsTable(lookupError)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[member-posts] Failed to look up post:', lookupError)
    return NextResponse.json({ message: 'Could not load this post.' }, { status: 500 })
  }
  if (!row) return NextResponse.json({ message: 'Post not found.' }, { status: 404 })

  if (!memberCanMutate((row.status ?? 'draft') as MemberPostStatus)) {
    return NextResponse.json({ message: REMOVED_POST_MESSAGE }, { status: 403 })
  }

  const { error } = await supabase
    .from('member_posts')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id)
    .neq('status', 'removed')

  if (error) {
    console.error('[member-posts] Failed to delete post:', error)
    return NextResponse.json({ message: 'Could not delete this post.' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
