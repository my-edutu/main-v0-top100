// lib/member-posts/client.ts
// Client-side wrappers around /api/member/posts* and /api/admin/member-posts.
// No secrets, no server-only imports — safe in a client component.
import type {
  MemberPost,
  MemberPostStatus,
  MemberPostWithAuthor,
} from '@/lib/member-posts/types'

export type MemberPostDraft = {
  title: string
  body: string
  excerpt?: string
  tags?: string[]
  coverUrl?: string
  status?: 'draft' | 'published'
}

/**
 * Thrown for a 503 "the migration has not been run" response, so the UI can
 * show the admin the SQL file to run instead of a generic failure.
 */
export class MemberPostsSetupRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MemberPostsSetupRequiredError'
  }
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.message || 'Request failed. Please try again.'
    if (res.status === 503) throw new MemberPostsSetupRequiredError(message)
    throw new Error(message)
  }
  return data
}

export async function fetchMyPosts(): Promise<MemberPost[]> {
  const res = await fetch('/api/member/posts', { cache: 'no-store' })
  const data = await jsonOrThrow(res)
  return (data.posts ?? []) as MemberPost[]
}

export async function createPost(draft: MemberPostDraft): Promise<MemberPost> {
  const res = await fetch('/api/member/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  const data = await jsonOrThrow(res)
  return data.post as MemberPost
}

export async function updatePost(
  postId: string,
  patch: Partial<MemberPostDraft>,
): Promise<MemberPost> {
  const res = await fetch(`/api/member/posts/${postId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const data = await jsonOrThrow(res)
  return data.post as MemberPost
}

export async function deletePost(postId: string): Promise<void> {
  const res = await fetch(`/api/member/posts/${postId}`, { method: 'DELETE' })
  await jsonOrThrow(res)
}

// --- admin -----------------------------------------------------------------

export async function fetchAllMemberPosts(
  status?: MemberPostStatus | 'all',
): Promise<MemberPostWithAuthor[]> {
  const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
  const res = await fetch(`/api/admin/member-posts${query}`, { cache: 'no-store' })
  const data = await jsonOrThrow(res)
  return (data.posts ?? []) as MemberPostWithAuthor[]
}

export async function moderateMemberPost(input: {
  postId: string
  status: 'published' | 'flagged' | 'removed'
  moderationNote?: string
}): Promise<MemberPostWithAuthor> {
  const res = await fetch('/api/admin/member-posts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await jsonOrThrow(res)
  return data.post as MemberPostWithAuthor
}
