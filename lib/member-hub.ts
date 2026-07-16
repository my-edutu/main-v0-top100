// lib/member-hub.ts
// DB-backed member-hub client. Replaces the previous localStorage mock.
// Type shapes are kept stable so the dashboard's rendering code needs no
// changes — only the data-fetching call sites move from sync to async.
//
// All functions here are thin `fetch` wrappers around the /api/member/* routes,
// which enforce auth + membership + BIO-limit rules on the server.

export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended'
export type ProfileStatus = 'draft' | 'submitted' | 'approved'

export type MemberProfile = {
  id: string
  name: string
  email: string
  inviteCode: string
  awardeeId?: string
  publicSlug?: string
  status: MemberStatus
  profileStatus: ProfileStatus
  headline: string
  bio: string
  location: string
  organization: string
  field: string
  avatarInitials: string
  recruiterVisible: boolean
  emailVisible: boolean
  showInDirectory: boolean
  allowDirectMessages: boolean
  opportunityAlerts: boolean
  magazineAlerts: boolean
  messageAlerts: boolean
  eventReminders: boolean
  hideEmailFromRecruiters: boolean
  requireProfileApproval: boolean
  securityEmails: boolean
  bioUpdateCount: number
  bioUpdateLimit: number
  createdAt: string
}

export type HubOpportunity = {
  id: string
  title: string
  type: string
  location: string
  deadline: string
}

export type MemberFeatureSubmission = {
  id: string
  memberId: string
  memberName: string
  title: string
  category: 'bio' | 'story' | 'product' | 'project'
  summary: string
  contactEmail: string
  status: 'pending' | 'reviewing' | 'approved' | 'published'
  createdAt: string
}

export type MemberNotification = {
  id: string
  title: string
  message: string
  audience: 'all' | 'approved'
  status: 'sent' | 'draft'
  createdAt: string
  readBy: string[]
  category: string
  ctaLabel: string | null
  ctaUrl: string | null
}

export type ConversationSummary = {
  id: string
  otherMember: {
    id: string
    name: string
    headline: string
    slug: string | null
    avatarUrl: string | null
    initials: string
  }
  lastMessage: { body: string; mine: boolean; createdAt: string } | null
  unreadCount: number
  lastMessageAt: string
}

export type DirectMessage = {
  id: string
  conversationId: string
  senderId: string
  mine: boolean
  body: string
  createdAt: string
  readAt: string | null
}

export type MemberHubState = {
  members: MemberProfile[]
  currentMemberId?: string
  opportunities: HubOpportunity[]
  featureSubmissions: MemberFeatureSubmission[]
  notifications: MemberNotification[]
}

// Default opportunities used as the OpportunitiesSection fallback before the
// live /api/opportunities fetch resolves (mirrors that route's fallback list).
export const defaultOpportunities: HubOpportunity[] = [
  { id: 'opp-1', title: 'Youth Climate Fellowship', type: 'Fellowship', location: 'Hybrid', deadline: 'Jul 30' },
  { id: 'opp-2', title: 'Founder Mentorship Sprint', type: 'Mentorship', location: 'Remote', deadline: 'Aug 12' },
  { id: 'opp-3', title: 'Africa Innovation Grant', type: 'Grant', location: 'Pan-African', deadline: 'Aug 28' },
  { id: 'opp-4', title: 'Leadership Story Residency', type: 'Residency', location: 'Lagos', deadline: 'Sep 04' },
]

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || 'Request failed. Please try again.')
  return data
}

/**
 * Load the current member's hub state (their profile, notifications and feature
 * submissions). Returns null-ish state the caller can guard on.
 */
export async function fetchMemberHubState(): Promise<MemberHubState> {
  const res = await fetch('/api/member/me', { cache: 'no-store' })
  const data = await jsonOrThrow(res)

  const member = data.member as MemberProfile | null
  return {
    members: member ? [member] : [],
    currentMemberId: member?.id,
    opportunities: defaultOpportunities,
    featureSubmissions: (data.featureSubmissions ?? []) as MemberFeatureSubmission[],
    notifications: (data.notifications ?? []) as MemberNotification[],
  }
}

/**
 * Update the current member's profile / preferences. `memberId` is accepted for
 * call-site compatibility but the server always uses the authenticated user.
 */
export async function updateMemberProfile(
  _memberId: string,
  patch: Partial<MemberProfile>,
): Promise<MemberProfile> {
  const res = await fetch('/api/member/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const data = await jsonOrThrow(res)
  return data.member as MemberProfile
}

export async function createFeatureSubmission(
  input: Pick<MemberFeatureSubmission, 'memberId' | 'memberName' | 'title' | 'category' | 'summary' | 'contactEmail'>,
): Promise<MemberFeatureSubmission> {
  const res = await fetch('/api/member/features', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await jsonOrThrow(res)
  return data.submission as MemberFeatureSubmission
}

/**
 * Mark a notification read. `memberId` accepted for call-site compatibility;
 * the server scopes the update to the authenticated user.
 */
export async function markNotificationRead(notificationId: string, _memberId?: string): Promise<void> {
  const res = await fetch('/api/member/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId }),
  })
  await jsonOrThrow(res)
}

/** Mark every notification for the authenticated user as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const res = await fetch('/api/member/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all: true }),
  })
  await jsonOrThrow(res)
}

// ---------------------------------------------------------------------------
// Direct messages
// ---------------------------------------------------------------------------

export type ConversationListResult = {
  conversations: ConversationSummary[]
  unreadTotal: number
}

export class MessagingSetupRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MessagingSetupRequiredError'
  }
}

async function dmJsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.message || 'Request failed. Please try again.'
    if (res.status === 503 && data?.setupRequired) throw new MessagingSetupRequiredError(message)
    throw new Error(message)
  }
  return data
}

export async function fetchConversations(): Promise<ConversationListResult> {
  const res = await fetch('/api/member/conversations', { cache: 'no-store' })
  const data = await dmJsonOrThrow(res)
  return {
    conversations: (data.conversations ?? []) as ConversationSummary[],
    unreadTotal: Number(data.unreadTotal ?? 0),
  }
}

export async function fetchConversation(conversationId: string): Promise<{
  conversation: ConversationSummary
  messages: DirectMessage[]
}> {
  const res = await fetch(`/api/member/conversations/${conversationId}`, { cache: 'no-store' })
  const data = await dmJsonOrThrow(res)
  return {
    conversation: data.conversation as ConversationSummary,
    messages: (data.messages ?? []) as DirectMessage[],
  }
}

/** Start (or reuse) a conversation with another member. Returns its id. */
export async function startConversation(recipientProfileId: string, body: string): Promise<string> {
  const res = await fetch('/api/member/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientProfileId, body }),
  })
  const data = await dmJsonOrThrow(res)
  return String(data.conversationId)
}

export async function sendMessage(conversationId: string, body: string): Promise<DirectMessage> {
  const res = await fetch(`/api/member/conversations/${conversationId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
  const data = await dmJsonOrThrow(res)
  return data.message as DirectMessage
}
