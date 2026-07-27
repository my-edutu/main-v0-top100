// lib/member-posts/server.ts
// Server-only helpers for member-authored posts: row -> view mapping, the
// queries the API routes and public pages share, and the missing-table
// degradation this project needs because the live DB routinely lags behind
// supabase/migrations/.
//
// Never import into a client component.
import type { createAdminClient } from '@/lib/supabase/server'
import { getAwardees } from '@/lib/awardees'
import type { MemberPost, MemberPostStatus, MemberPostWithAuthor } from '@/lib/member-posts/types'

export const MEMBER_POSTS_SETUP_MESSAGE =
  'Member posts are not set up yet. Ask the admin to run supabase/migrations/20260728_member_posts.sql.'

// Publishing is gated on profiles.membership_status, which is added by the
// member-hub migration. On a database where that has never been applied the
// column simply is not there, and no one could otherwise be told why they
// cannot publish.
export const MEMBERSHIP_SETUP_MESSAGE =
  'Membership status is not set up yet. Ask the admin to run supabase/SETUP-MEMBER-HUB.sql (or supabase/migrations/20260706_access_codes_and_membership.sql) before members can publish.'

type SupabaseAdmin = ReturnType<typeof createAdminClient>
type PgError = { code?: string; message?: string } | null

/** True when the failure is "the member_posts migration has not been run yet". */
export function isMissingMemberPostsTable(error: PgError): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*member_posts.* does not exist|does not exist|schema cache/i.test(
    error.message ?? '',
  )
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

export function mapMemberPost(row: any): MemberPost {
  return {
    id: row.id,
    slug: row.slug ?? '',
    title: row.title ?? '',
    excerpt: row.excerpt ?? null,
    body: row.body ?? '',
    coverUrl: row.cover_url ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    status: (row.status ?? 'draft') as MemberPostStatus,
    moderationNote: row.moderation_note ?? null,
    publishedAt: row.published_at ?? null,
    viewCount: typeof row.view_count === 'number' ? row.view_count : 0,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
  }
}

export function mapMemberPostWithAuthor(row: any): MemberPostWithAuthor {
  const profile = row.profiles ?? null
  return {
    ...mapMemberPost(row),
    profileId: row.profile_id,
    authorName: profile?.full_name || profile?.email || 'Awardee',
    authorEmail: profile?.email ?? '',
    authorSlug: profile?.slug ?? null,
  }
}

// ---------------------------------------------------------------------------
// Member-scoped queries
// ---------------------------------------------------------------------------

/** Every post by one author, all statuses, newest first. */
export async function loadPostsForAuthor(supabase: SupabaseAdmin, profileId: string) {
  const { data, error } = await supabase
    .from('member_posts')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  return { rows: data ?? [], error }
}

/** One post, scoped to its author — never trust an id alone. */
export async function loadOwnPost(supabase: SupabaseAdmin, postId: string, profileId: string) {
  const { data, error } = await supabase
    .from('member_posts')
    .select('*')
    .eq('id', postId)
    .eq('profile_id', profileId)
    .maybeSingle()

  return { row: data ?? null, error }
}

/** The slugs this author already uses, for per-author uniquification. */
export async function loadSlugsForAuthor(supabase: SupabaseAdmin, profileId: string) {
  const { data, error } = await supabase
    .from('member_posts')
    .select('slug')
    .eq('profile_id', profileId)

  return { slugs: (data ?? []).map((row: any) => row.slug as string), error }
}

/**
 * The member's membership status, read off a `select('*')` row rather than by
 * naming the column: on a database where the member-hub migration has never
 * run, naming it would fail the whole query instead of telling the caller
 * which SQL file to run.
 */
export async function loadMembershipStatus(supabase: SupabaseAdmin, profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  if (error || !data) {
    return { status: null as string | null, columnMissing: false, error }
  }

  const columnMissing = !('membership_status' in (data as Record<string, unknown>))
  return {
    status: columnMissing ? null : ((data as any).membership_status ?? null),
    columnMissing,
    error: null as PgError,
  }
}

// ---------------------------------------------------------------------------
// Public queries — these must ALWAYS constrain status = 'published'
// ---------------------------------------------------------------------------

/**
 * One published post by (author, slug). The `status = 'published'` filter is
 * applied here, server-side, and is never derived from anything the client
 * sent — a draft, a flagged post and a removed post are all equally invisible.
 */
export async function loadPublishedPost(
  supabase: SupabaseAdmin,
  profileId: string,
  slug: string,
) {
  const { data, error } = await supabase
    .from('member_posts')
    .select('*')
    .eq('profile_id', profileId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  return { row: data ?? null, error }
}

/** An author's published posts, newest first. Same non-negotiable filter. */
export async function loadPublishedPostsForAuthor(
  supabase: SupabaseAdmin,
  profileId: string,
  limit = 24,
) {
  const { data, error } = await supabase
    .from('member_posts')
    .select('*')
    .eq('profile_id', profileId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit)

  return { rows: data ?? [], error }
}

/**
 * Best-effort view counter. A failure here must never break the page, so it
 * swallows everything — including the table not existing at all.
 */
export async function bumpViewCount(
  supabase: SupabaseAdmin,
  postId: string,
  currentCount: number,
): Promise<void> {
  try {
    await supabase
      .from('member_posts')
      .update({ view_count: currentCount + 1 })
      .eq('id', postId)
  } catch (error) {
    console.error('[member-posts] Could not increment view_count:', error)
  }
}

// ---------------------------------------------------------------------------
// Awardee resolution
// ---------------------------------------------------------------------------

export type ResolvedAwardee = {
  slug: string
  name: string
  profileId: string | null
  avatarUrl: string | null
  headline: string | null
}

/**
 * Resolve a public awardee slug to the profile that owns it, using the
 * existing directory helper. Returns null when the slug is unknown, and a
 * record with `profileId: null` for a directory entry that has no linked
 * member account (a workbook-seeded awardee) — such a profile can never have
 * posts, and the caller should treat that as "no posts" rather than an error.
 */
export async function resolveAwardeeBySlug(slug: string): Promise<ResolvedAwardee | null> {
  try {
    const awardees = await getAwardees()
    const match = awardees.find((entry) => entry.slug === slug && entry.is_public !== false)
    if (!match) return null

    return {
      slug: match.slug,
      name: match.name,
      profileId: match.profile_id ?? null,
      avatarUrl: match.avatar_url ?? null,
      headline: match.headline ?? null,
    }
  } catch (error) {
    console.error('[member-posts] Could not resolve awardee by slug:', error)
    return null
  }
}
