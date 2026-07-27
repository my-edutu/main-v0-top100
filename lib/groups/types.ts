// lib/groups/types.ts
// Shared shapes, zod schemas and *pure* rules for awardee groups.
// Safe to import from both server routes and client components — nothing here
// touches the database, `fetch`, or any server-only module.
import { z } from 'zod'

export const GROUP_VISIBILITIES = ['open', 'request', 'private'] as const
export type GroupVisibility = (typeof GROUP_VISIBILITIES)[number]

export const GROUP_ROLES = ['member', 'moderator', 'owner'] as const
export type GroupRole = (typeof GROUP_ROLES)[number]

export const GROUP_MEMBER_STATUSES = ['pending', 'active', 'banned'] as const
export type GroupMemberStatus = (typeof GROUP_MEMBER_STATUSES)[number]

export const GROUP_MESSAGE_MAX = 4000
export const GROUP_MESSAGE_PAGE_SIZE = 50
/** A member may not spin up more than this many groups in a rolling day. */
export const GROUP_CREATE_DAILY_LIMIT = 3

// ---------------------------------------------------------------------------
// API shapes
// ---------------------------------------------------------------------------

export type GroupMembershipView = {
  role: GroupRole
  status: GroupMemberStatus
  unreadCount: number
}

export type GroupSummary = {
  id: string
  slug: string
  name: string
  description: string
  topic: string
  coverUrl: string | null
  visibility: GroupVisibility
  isArchived: boolean
  memberCount: number
  createdAt: string
  membership: GroupMembershipView | null
}

export type GroupMessageView = {
  id: string
  groupId: string
  authorId: string
  authorName: string
  authorInitials: string
  mine: boolean
  body: string
  isDeleted: boolean
  createdAt: string
}

export type GroupMemberView = {
  profileId: string
  name: string
  initials: string
  headline: string
  role: GroupRole
  status: GroupMemberStatus
  joinedAt: string
}

export type GroupDetail = {
  group: GroupSummary
  messages: GroupMessageView[]
  /** Only populated for owners/moderators — everyone else gets an empty list. */
  pendingMembers: GroupMemberView[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Give the group a name of at least 3 characters')
    .max(80, 'Keep the group name under 80 characters'),
  description: z.string().trim().max(500, 'Keep the description under 500 characters').default(''),
  topic: z.string().trim().max(60, 'Keep the topic under 60 characters').default(''),
  visibility: z.enum(GROUP_VISIBILITIES).default('open'),
})
export type CreateGroupInput = z.infer<typeof createGroupSchema>

export const postGroupMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Write something before sending')
    .max(GROUP_MESSAGE_MAX, `Messages are limited to ${GROUP_MESSAGE_MAX} characters`),
})

/**
 * Owner/moderator moderation of one membership. `removed` is not a stored
 * status — it means "decline this request / drop this member", which deletes
 * the row so they could ask again later. Banning is the permanent option.
 */
export const MEMBERSHIP_PATCH_STATUSES = ['active', 'banned', 'pending', 'removed'] as const
export type MembershipPatchStatus = (typeof MEMBERSHIP_PATCH_STATUSES)[number]

export const membershipPatchSchema = z.object({
  profileId: z.string().trim().uuid('Choose a member'),
  status: z.enum(MEMBERSHIP_PATCH_STATUSES),
})

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

const SLUG_MAX = 60

/** Lowercase, hyphenated, ASCII-safe. Never returns an empty string. */
export function slugifyGroupName(name: string): string {
  const slug = (name ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')

  return slug || 'group'
}

/**
 * First slug in the `base`, `base-2`, `base-3`, ... series that is not already
 * taken. The suffix is appended within SLUG_MAX by trimming the base, so a
 * maximum-length name still collides cleanly instead of producing duplicates.
 */
export function nextAvailableSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const tail = `-${suffix}`
    const candidate = `${base.slice(0, SLUG_MAX - tail.length).replace(/-+$/g, '')}${tail}`
    if (!used.has(candidate)) return candidate
  }

  // Practically unreachable; keeps the return type honest.
  return `${base.slice(0, SLUG_MAX - 14).replace(/-+$/g, '')}-${Date.now().toString(36)}`
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

export function initialsFromName(name: string | null | undefined): string {
  return (
    (name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'AF'
  )
}

// ---------------------------------------------------------------------------
// Unread counting
// ---------------------------------------------------------------------------

/**
 * Messages strictly newer than `lastReadAt`. A membership that has never been
 * opened (`last_read_at is null`) counts everything, which is what makes a
 * freshly joined group show its backlog as unread.
 */
export function countUnread(
  messages: Array<{ createdAt?: string | null; created_at?: string | null }>,
  lastReadAt: string | null | undefined,
): number {
  if (!lastReadAt) return messages.length

  const readAt = new Date(lastReadAt).getTime()
  if (Number.isNaN(readAt)) return messages.length

  return messages.filter((message) => {
    const raw = message.createdAt ?? message.created_at
    if (!raw) return false
    const at = new Date(raw).getTime()
    return !Number.isNaN(at) && at > readAt
  }).length
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type PermissionVerdict =
  | { ok: true }
  | { ok: false; status: number; message: string }

export type PostPermissionContext = {
  /** `profiles.membership_status` for the caller. */
  memberStatus: string | null | undefined
  group: { visibility: GroupVisibility; isArchived: boolean } | null
  membership: { role: GroupRole; status: GroupMemberStatus } | null
}

/**
 * The single source of truth for "may this person post in this group".
 * `assertCanPost` in lib/groups/server.ts loads the rows and delegates here so
 * the rule itself stays pure and testable.
 */
export function canPostInGroup(context: PostPermissionContext): PermissionVerdict {
  const { group, membership, memberStatus } = context

  if (!group) {
    return { ok: false, status: 404, message: 'This group no longer exists.' }
  }
  if (group.isArchived) {
    return { ok: false, status: 403, message: 'This group has been archived, so it is read-only.' }
  }
  if (memberStatus !== 'approved') {
    return {
      ok: false,
      status: 403,
      message: 'Only approved awardees can post in groups. Your membership is still being reviewed.',
    }
  }
  if (!membership) {
    return { ok: false, status: 403, message: 'Join this group before posting in it.' }
  }
  if (membership.status === 'banned') {
    return { ok: false, status: 403, message: 'You can no longer post in this group.' }
  }
  if (membership.status === 'pending') {
    return {
      ok: false,
      status: 403,
      message: 'Your request to join is still waiting for approval.',
    }
  }

  return { ok: true }
}

/** Reading a group: private groups are invisible to non-members. */
export function canViewGroup(context: {
  group: { visibility: GroupVisibility } | null
  membership: { status: GroupMemberStatus } | null
  isSiteAdmin?: boolean
}): PermissionVerdict {
  const { group, membership, isSiteAdmin } = context
  if (!group) return { ok: false, status: 404, message: 'This group no longer exists.' }
  if (isSiteAdmin) return { ok: true }
  if (group.visibility !== 'private') return { ok: true }
  if (membership && membership.status !== 'banned') return { ok: true }
  return { ok: false, status: 403, message: 'This group is private.' }
}

/** Owners and moderators may approve, decline and ban. */
export function canModerateGroup(role: GroupRole | null | undefined, status?: GroupMemberStatus): boolean {
  if (status && status !== 'active') return false
  return role === 'owner' || role === 'moderator'
}

/**
 * The last remaining owner may not leave — the group would become
 * unadministrable, with no one able to approve requests or moderate.
 */
export function canLeaveGroup(context: {
  membership: { role: GroupRole; status: GroupMemberStatus } | null
  activeOwnerCount: number
}): PermissionVerdict {
  const { membership, activeOwnerCount } = context
  if (!membership) {
    return { ok: false, status: 404, message: 'You are not a member of this group.' }
  }
  if (membership.role === 'owner' && membership.status === 'active' && activeOwnerCount <= 1) {
    return {
      ok: false,
      status: 409,
      message:
        'You are the only owner of this group. Promote another member to owner before you leave.',
    }
  }
  return { ok: true }
}

/** Authors delete their own messages; moderators, owners and site admins any. */
export function canDeleteMessage(context: {
  message: { authorId: string } | null
  viewerId: string
  membership: { role: GroupRole; status: GroupMemberStatus } | null
  isSiteAdmin?: boolean
}): PermissionVerdict {
  const { message, viewerId, membership, isSiteAdmin } = context
  if (!message) return { ok: false, status: 404, message: 'That message no longer exists.' }
  if (isSiteAdmin) return { ok: true }
  if (message.authorId === viewerId) return { ok: true }
  if (canModerateGroup(membership?.role, membership?.status)) return { ok: true }
  return { ok: false, status: 403, message: 'You cannot delete this message.' }
}

/** Which membership status a join request lands in, given the visibility. */
export function joinStatusFor(visibility: GroupVisibility): GroupMemberStatus | null {
  if (visibility === 'open') return 'active'
  if (visibility === 'request') return 'pending'
  return null
}
