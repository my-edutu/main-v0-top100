// lib/groups/server.ts
// Server-only helpers for the awardee groups API (/api/member/groups*,
// /api/admin/groups). Never import into a client component.
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  canPostInGroup,
  countUnread,
  initialsFromName,
  nextAvailableSlug,
  slugifyGroupName,
  type GroupMemberStatus,
  type GroupMemberView,
  type GroupMessageView,
  type GroupRole,
  type GroupSummary,
  type GroupVisibility,
} from '@/lib/groups/types'

export const GROUPS_SETUP_MESSAGE =
  'Groups are not set up yet. Ask the admin to run supabase/migrations/20260728_member_groups.sql in the Supabase SQL editor.'

/**
 * True when the failure is "the migration has not been run yet" rather than a
 * real fault. Mirrors isMissingAwardTable in lib/awards/server.ts — the live DB
 * regularly lags supabase/migrations/, and a missing table must degrade to a
 * 503 with instructions, never a 500 that breaks the dashboard.
 */
export function isMissingGroupsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*member_group.* does not exist|could not find the table|schema cache/i.test(
    error.message ?? '',
  )
}

// ---------------------------------------------------------------------------
// Row shapes (only the columns this module actually reads)
// ---------------------------------------------------------------------------

export type GroupRow = {
  id: string
  slug: string
  name: string
  description: string | null
  topic: string | null
  cover_url: string | null
  visibility: GroupVisibility
  is_archived: boolean
  member_count: number
  created_by: string | null
  created_at: string
}

export type GroupMemberRow = {
  id: string
  group_id: string
  profile_id: string
  role: GroupRole
  status: GroupMemberStatus
  joined_at: string
  last_read_at: string | null
}

export type GroupMessageRow = {
  id: string
  group_id: string
  profile_id: string
  body: string
  is_deleted: boolean
  created_at: string
}

export type GroupProfileLite = {
  id: string
  full_name: string | null
  email: string | null
  headline: string | null
  membership_status: string | null
  role: string | null
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

export async function loadGroupProfiles(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, GroupProfileLite>> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  if (unique.length === 0) return new Map()

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email, headline, membership_status, role')
    .in('id', unique)

  const map = new Map<string, GroupProfileLite>()
  for (const row of (data ?? []) as GroupProfileLite[]) map.set(row.id, row)
  return map
}

export async function loadProfileForGroups(
  supabase: SupabaseClient,
  profileId: string,
): Promise<GroupProfileLite | null> {
  const profiles = await loadGroupProfiles(supabase, [profileId])
  return profiles.get(profileId) ?? null
}

export function isSiteAdminProfile(profile: GroupProfileLite | null | undefined): boolean {
  const role = (profile?.role ?? '').toLowerCase()
  return role === 'admin' || role === 'superadmin'
}

export async function loadGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<{ group: GroupRow | null; error: any }> {
  const { data, error } = await supabase
    .from('member_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle()
  return { group: (data as GroupRow | null) ?? null, error }
}

export async function loadMembership(
  supabase: SupabaseClient,
  groupId: string,
  profileId: string,
): Promise<{ membership: GroupMemberRow | null; error: any }> {
  const { data, error } = await supabase
    .from('member_group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('profile_id', profileId)
    .maybeSingle()
  return { membership: (data as GroupMemberRow | null) ?? null, error }
}

/** How many *active* owners a group has — drives the last-owner-cannot-leave rule. */
export async function countActiveOwners(supabase: SupabaseClient, groupId: string): Promise<number> {
  const { data } = await supabase
    .from('member_group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('role', 'owner')
    .eq('status', 'active')
  return (data ?? []).length
}

// ---------------------------------------------------------------------------
// The posting gate
// ---------------------------------------------------------------------------

export type PostGate =
  | { ok: true; group: GroupRow; membership: GroupMemberRow }
  | { ok: false; status: number; message: string; setupRequired?: boolean }

/**
 * The one place the "may this member post here" rule is enforced. Loads the
 * profile, group and membership, then hands the decision to the pure
 * canPostInGroup() so the rule itself stays testable without a database.
 */
export async function assertCanPost(
  supabase: SupabaseClient,
  profileId: string,
  groupId: string,
): Promise<PostGate> {
  const profile = await loadProfileForGroups(supabase, profileId)

  const { group, error: groupError } = await loadGroup(supabase, groupId)
  if (groupError) {
    if (isMissingGroupsTable(groupError)) {
      return { ok: false, status: 503, message: GROUPS_SETUP_MESSAGE, setupRequired: true }
    }
    console.error('[groups] assertCanPost group lookup failed', groupError)
    return { ok: false, status: 500, message: 'Could not check your access to this group.' }
  }

  const { membership, error: membershipError } = await loadMembership(supabase, groupId, profileId)
  if (membershipError) {
    if (isMissingGroupsTable(membershipError)) {
      return { ok: false, status: 503, message: GROUPS_SETUP_MESSAGE, setupRequired: true }
    }
    console.error('[groups] assertCanPost membership lookup failed', membershipError)
    return { ok: false, status: 500, message: 'Could not check your access to this group.' }
  }

  const verdict = canPostInGroup({
    memberStatus: profile?.membership_status ?? null,
    group: group ? { visibility: group.visibility, isArchived: group.is_archived } : null,
    membership: membership ? { role: membership.role, status: membership.status } : null,
  })

  if (!verdict.ok) return verdict
  // canPostInGroup only returns ok when both rows exist; narrow for the caller.
  return { ok: true, group: group as GroupRow, membership: membership as GroupMemberRow }
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

/**
 * Slugify the name, then walk the `base`, `base-2`, ... series past whatever
 * already exists. A concurrent insert can still lose the unique-index race —
 * the create route retries once on that.
 */
export async function generateUniqueSlug(supabase: SupabaseClient, name: string): Promise<string> {
  const base = slugifyGroupName(name)
  const { data } = await supabase
    .from('member_groups')
    .select('slug')
    .like('slug', `${base}%`)
    .limit(200)

  const taken = ((data ?? []) as Array<{ slug: string }>).map((row) => row.slug)
  return nextAvailableSlug(base, taken)
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapGroupSummary(
  row: GroupRow,
  membership: GroupMemberRow | null,
  unreadCount = 0,
): GroupSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    topic: row.topic ?? '',
    coverUrl: row.cover_url ?? null,
    visibility: row.visibility,
    isArchived: Boolean(row.is_archived),
    memberCount: row.member_count ?? 0,
    createdAt: row.created_at,
    membership: membership
      ? { role: membership.role, status: membership.status, unreadCount }
      : null,
  }
}

export function mapGroupMessage(
  row: GroupMessageRow,
  author: GroupProfileLite | undefined,
  viewerId: string,
): GroupMessageView {
  const name = author?.full_name || author?.email || 'Awardee'
  return {
    id: row.id,
    groupId: row.group_id,
    authorId: row.profile_id,
    authorName: row.is_deleted ? name : name,
    authorInitials: initialsFromName(name),
    mine: row.profile_id === viewerId,
    // A soft-deleted message keeps its row (moderation stays auditable) but
    // must never ship its text to a client.
    body: row.is_deleted ? '' : (row.body ?? ''),
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
  }
}

export function mapGroupMember(
  row: GroupMemberRow,
  profile: GroupProfileLite | undefined,
): GroupMemberView {
  const name = profile?.full_name || profile?.email || 'Awardee'
  return {
    profileId: row.profile_id,
    name,
    initials: initialsFromName(name),
    headline: profile?.headline ?? '',
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  }
}

// ---------------------------------------------------------------------------
// Unread counts for the group list
// ---------------------------------------------------------------------------

/**
 * Unread count per group for one member, in a single query rather than one per
 * group. Only groups the member actually belongs to are asked about.
 */
export async function loadUnreadCounts(
  supabase: SupabaseClient,
  memberships: GroupMemberRow[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  const groupIds = memberships.map((membership) => membership.group_id)
  if (groupIds.length === 0) return counts

  const { data, error } = await supabase
    .from('member_group_messages')
    .select('group_id, created_at')
    .in('group_id', groupIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('[groups] loadUnreadCounts failed', error)
    return counts
  }

  const byGroup = new Map<string, Array<{ created_at: string }>>()
  for (const row of (data ?? []) as Array<{ group_id: string; created_at: string }>) {
    const list = byGroup.get(row.group_id) ?? []
    list.push({ created_at: row.created_at })
    byGroup.set(row.group_id, list)
  }

  for (const membership of memberships) {
    counts.set(
      membership.group_id,
      countUnread(byGroup.get(membership.group_id) ?? [], membership.last_read_at),
    )
  }

  return counts
}

/** Stamp last_read_at so the unread badge clears. Best-effort: never throws. */
export async function markGroupRead(
  supabase: SupabaseClient,
  groupId: string,
  profileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('member_group_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('group_id', groupId)
    .eq('profile_id', profileId)

  if (error) console.error('[groups] markGroupRead failed', error)
}
