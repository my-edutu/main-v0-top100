// app/api/member/posts/route.ts
// The authenticated member's own posts.
//   GET  -> every post they have written, any status, newest first
//   POST -> create one (draft, or published if their membership is approved)
//
// Note this is deliberately separate from /api/posts (the editorial blog),
// which requires an admin on every write. Member posts have their own table,
// their own moderation lifecycle and their own URL space.
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, createRateLimitResponse } from '@/lib/rate-limit'
import {
  MEMBER_POSTS_SETUP_MESSAGE,
  MEMBERSHIP_SETUP_MESSAGE,
  isMissingMemberPostsTable,
  loadMembershipStatus,
  loadPostsForAuthor,
  loadSlugsForAuthor,
  mapMemberPost,
} from '@/lib/member-posts/server'
import {
  PUBLISH_REQUIRES_APPROVAL_MESSAGE,
  canPublish,
  createMemberPostSchema,
  nextPublishedAt,
  slugifyTitle,
  uniquifySlug,
} from '@/lib/member-posts/types'

export const runtime = 'nodejs'

// At most 10 posts a day per member. Per-member, never per-IP: a shared campus
// or office IP must not throttle everyone behind it.
const POST_CREATE_LIMIT = { maxRequests: 10, windowSeconds: 24 * 60 * 60 }

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()
  const { rows, error } = await loadPostsForAuthor(supabase, user.id)

  if (error) {
    if (isMissingMemberPostsTable(error)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[member-posts] Failed to load posts:', error)
    return NextResponse.json({ message: 'Could not load your posts.' }, { status: 500 })
  }

  return NextResponse.json({ posts: rows.map(mapMemberPost) })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const rateLimit = checkRateLimit({ ...POST_CREATE_LIMIT, identifier: `member-posts:${user.id}` })
  if (!rateLimit.success) {
    return createRateLimitResponse(
      rateLimit,
      'You have reached the limit of 10 posts a day. Try again tomorrow.',
    ) as NextResponse
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const parsed = createMemberPostSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message || 'Please check the post details.' },
      { status: 400 },
    )
  }

  const input = parsed.data
  const supabase = createAdminClient()

  // Only approved members may publish; a pending member may still save drafts.
  if (input.status === 'published') {
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

  const { slugs, error: slugError } = await loadSlugsForAuthor(supabase, user.id)
  if (slugError) {
    if (isMissingMemberPostsTable(slugError)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[member-posts] Failed to load existing slugs:', slugError)
    return NextResponse.json({ message: 'Could not save your post.' }, { status: 500 })
  }

  const slug = uniquifySlug(slugifyTitle(input.title), slugs)

  const { data, error } = await supabase
    .from('member_posts')
    .insert({
      profile_id: user.id,
      slug,
      title: input.title,
      excerpt: input.excerpt ?? null,
      body: input.body,
      cover_url: input.coverUrl ?? null,
      tags: input.tags ?? [],
      status: input.status,
      published_at: nextPublishedAt(null, input.status),
    })
    .select('*')
    .single()

  if (error) {
    if (isMissingMemberPostsTable(error)) {
      return NextResponse.json({ message: MEMBER_POSTS_SETUP_MESSAGE }, { status: 503 })
    }
    console.error('[member-posts] Failed to create post:', error)
    return NextResponse.json({ message: 'Could not save your post.' }, { status: 500 })
  }

  return NextResponse.json({ post: mapMemberPost(data) }, { status: 201 })
}
