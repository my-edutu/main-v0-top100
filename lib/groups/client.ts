// lib/groups/client.ts
// Browser-side wrappers around /api/member/groups*. Safe to import into client
// components: no secrets, no server-only imports.
import type {
  CreateGroupInput,
  GroupDetail,
  GroupMemberStatus,
  GroupMessageView,
  GroupSummary,
  MembershipPatchStatus,
} from '@/lib/groups/types'

/**
 * Thrown when the API answers 503 because supabase/migrations/20260728_member_groups.sql
 * has not been run yet. The UI renders this as a calm inline notice rather than
 * an error toast, because it is an admin setup step, not a member's problem.
 */
export class GroupsSetupRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GroupsSetupRequiredError'
  }
}

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.message || 'Request failed. Please try again.'
    if (res.status === 503 && data?.setupRequired) throw new GroupsSetupRequiredError(message)
    throw new Error(message)
  }
  return data
}

export async function fetchGroups(): Promise<GroupSummary[]> {
  const res = await fetch('/api/member/groups', { cache: 'no-store' })
  const data = await jsonOrThrow(res)
  return (data.groups ?? []) as GroupSummary[]
}

export async function createGroup(input: CreateGroupInput): Promise<GroupSummary> {
  const res = await fetch('/api/member/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await jsonOrThrow(res)
  return data.group as GroupSummary
}

export async function fetchGroup(groupId: string): Promise<GroupDetail> {
  const res = await fetch(`/api/member/groups/${groupId}`, { cache: 'no-store' })
  const data = await jsonOrThrow(res)
  return data as GroupDetail
}

export async function fetchGroupMessages(
  groupId: string,
  before?: string,
): Promise<{ messages: GroupMessageView[]; hasMore: boolean }> {
  const query = before ? `?before=${encodeURIComponent(before)}` : ''
  const res = await fetch(`/api/member/groups/${groupId}/messages${query}`, { cache: 'no-store' })
  const data = await jsonOrThrow(res)
  return {
    messages: (data.messages ?? []) as GroupMessageView[],
    hasMore: Boolean(data.hasMore),
  }
}

export async function postGroupMessage(groupId: string, body: string): Promise<GroupMessageView> {
  const res = await fetch(`/api/member/groups/${groupId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
  const data = await jsonOrThrow(res)
  return data.message as GroupMessageView
}

export async function deleteGroupMessage(groupId: string, messageId: string): Promise<void> {
  const res = await fetch(
    `/api/member/groups/${groupId}/messages?messageId=${encodeURIComponent(messageId)}`,
    { method: 'DELETE' },
  )
  await jsonOrThrow(res)
}

export async function joinGroup(
  groupId: string,
): Promise<{ status: GroupMemberStatus; alreadyMember: boolean }> {
  const res = await fetch(`/api/member/groups/${groupId}/membership`, { method: 'POST' })
  const data = await jsonOrThrow(res)
  return {
    status: (data.status ?? 'active') as GroupMemberStatus,
    alreadyMember: Boolean(data.alreadyMember),
  }
}

export async function leaveGroup(groupId: string): Promise<void> {
  const res = await fetch(`/api/member/groups/${groupId}/membership`, { method: 'DELETE' })
  await jsonOrThrow(res)
}

export async function updateGroupMembership(
  groupId: string,
  profileId: string,
  status: MembershipPatchStatus,
): Promise<void> {
  const res = await fetch(`/api/member/groups/${groupId}/membership`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, status }),
  })
  await jsonOrThrow(res)
}
