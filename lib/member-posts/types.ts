// lib/member-posts/types.ts
// Types, zod schemas and the pure logic behind member-authored posts.
//
// Everything here is dependency-free (zod only) and safe to import from a
// client component, an API route or a test. The moderation rules in
// particular live here rather than inline in the routes so that "a member can
// never leave `removed`" is one testable function instead of a condition
// repeated in three handlers.
import { z } from 'zod'

export type MemberPostStatus = 'draft' | 'published' | 'flagged' | 'removed'

export const MEMBER_POST_STATUSES: readonly MemberPostStatus[] = [
  'draft',
  'published',
  'flagged',
  'removed',
]

/** Statuses a member is ever allowed to put a post into. */
export const MEMBER_WRITABLE_STATUSES: readonly MemberPostStatus[] = ['draft', 'published']

/** Statuses an admin moderation action may set. */
export const ADMIN_WRITABLE_STATUSES: readonly MemberPostStatus[] = [
  'published',
  'flagged',
  'removed',
]

export type MemberPost = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  coverUrl: string | null
  tags: string[]
  status: MemberPostStatus
  moderationNote: string | null
  publishedAt: string | null
  viewCount: number
  createdAt: string
  updatedAt: string
}

/** A post plus its author, as the admin console and the public pages need it. */
export type MemberPostWithAuthor = MemberPost & {
  profileId: string
  authorName: string
  authorEmail: string
  authorSlug: string | null
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const TITLE_MIN = 3
export const TITLE_MAX = 160
export const BODY_MIN = 20
export const BODY_MAX = 40000
export const EXCERPT_MAX = 320
export const TAGS_MAX = 6
export const TAG_MAX_LENGTH = 24

const titleSchema = z.string().trim().min(TITLE_MIN).max(TITLE_MAX)
const bodySchema = z.string().trim().min(BODY_MIN).max(BODY_MAX)

// An empty string from a form field means "not provided", not "invalid".
const excerptSchema = z
  .string()
  .trim()
  .max(EXCERPT_MAX)
  .optional()
  .transform((value) => (value ? value : undefined))

const coverUrlSchema = z
  .union([z.literal(''), z.string().trim().url()])
  .optional()
  .transform((value) => (value ? value : undefined))

const tagsSchema = z
  .array(z.string().trim().min(1).max(TAG_MAX_LENGTH))
  .max(TAGS_MAX)
  .optional()

const memberStatusSchema = z.enum(['draft', 'published'])

export const createMemberPostSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  excerpt: excerptSchema,
  tags: tagsSchema,
  coverUrl: coverUrlSchema,
  status: memberStatusSchema.optional().default('draft'),
})

export type CreateMemberPostInput = z.infer<typeof createMemberPostSchema>

// On update, an empty string is an explicit "clear this field" rather than
// "field omitted" — otherwise a member could never remove an excerpt or a
// cover image once set.
const clearableExcerptSchema = z
  .union([z.literal(''), z.string().trim().max(EXCERPT_MAX)])
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null))

const clearableCoverUrlSchema = z
  .union([z.literal(''), z.string().trim().url()])
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null))

export const updateMemberPostSchema = z
  .object({
    title: titleSchema.optional(),
    body: bodySchema.optional(),
    excerpt: clearableExcerptSchema,
    tags: tagsSchema,
    coverUrl: clearableCoverUrlSchema,
    status: memberStatusSchema.optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'Nothing to update.',
  })

export type UpdateMemberPostInput = z.infer<typeof updateMemberPostSchema>

export const moderateMemberPostSchema = z.object({
  postId: z.string().uuid(),
  status: z.enum(['published', 'flagged', 'removed']),
  moderationNote: z.string().trim().max(1000).optional(),
})

export type ModerateMemberPostInput = z.infer<typeof moderateMemberPostSchema>

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

const SLUG_MAX_LENGTH = 80

// Unicode combining marks, written as escapes so the range survives any
// re-encoding of this file.
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g')

/** Title -> URL slug. Always returns a non-empty, URL-safe string. */
export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    // Strip combining marks so accented letters survive as their base letter
    // rather than being lost to the non-alphanumeric filter below.
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')

  return slug || 'post'
}

/**
 * Make `base` unique against the slugs this author already uses, by appending
 * `-2`, `-3`, ... Uniqueness is per author, so `taken` must only ever be one
 * author's slugs.
 */
export function uniquifySlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`
    if (!used.has(candidate)) return candidate
  }

  // Practically unreachable; keeps the return type honest without looping forever.
  return `${base}-${Date.now()}`
}

// ---------------------------------------------------------------------------
// Moderation / status rules
// ---------------------------------------------------------------------------

export type PostActor = 'member' | 'admin'

/**
 * The whole status-permission matrix, in one place.
 *
 * Member: may only ever set `draft` or `published`, and may never touch a post
 * that has been `removed` — that row is a moderation record, not a draft.
 * A `flagged` post is recoverable: the member sees the note, fixes it, and
 * publishes again.
 *
 * Admin: may set `published`, `flagged` or `removed` from anywhere, including
 * back out of `removed` if a removal was a mistake.
 */
export function canSetStatus(
  actor: PostActor,
  current: MemberPostStatus,
  next: MemberPostStatus,
): boolean {
  if (actor === 'admin') {
    return ADMIN_WRITABLE_STATUSES.includes(next)
  }

  if (current === 'removed') return false
  return MEMBER_WRITABLE_STATUSES.includes(next)
}

/** Whether a member may edit (or delete) this post at all. */
export function memberCanMutate(current: MemberPostStatus): boolean {
  return current !== 'removed'
}

export const REMOVED_POST_MESSAGE = 'This post was removed by the admin team.'

/**
 * `published_at` is set once, the first time a post goes live, and never
 * moved again. Re-publishing a flagged post keeps its original date, so the
 * public ordering does not jump around because of a moderation round-trip.
 */
export function nextPublishedAt(
  existing: string | null,
  nextStatus: MemberPostStatus,
  now: () => string = () => new Date().toISOString(),
): string | null {
  if (existing) return existing
  if (nextStatus === 'published') return now()
  return null
}

/**
 * Re-slug only when the title changed AND the post has never been published.
 * Changing the slug of a live post silently breaks its public URL and every
 * link anyone has already shared.
 */
export function shouldReslug(options: {
  titleChanged: boolean
  publishedAt: string | null
}): boolean {
  return options.titleChanged && options.publishedAt === null
}

/** Only approved members may publish. A pending member may still save drafts. */
export function canPublish(membershipStatus: string | null | undefined): boolean {
  return membershipStatus === 'approved'
}

export const PUBLISH_REQUIRES_APPROVAL_MESSAGE =
  'Your membership is still being reviewed, so you can save this as a draft but not publish it yet.'

/** The public URL of a published post. */
export function memberPostPath(awardeeSlug: string, postSlug: string): string {
  return `/awardees/${awardeeSlug}/posts/${postSlug}`
}

/** Rough reading time in minutes, for the public post header. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
