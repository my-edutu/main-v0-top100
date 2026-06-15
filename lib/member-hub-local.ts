export type MemberStatus = 'pending' | 'approved' | 'rejected'
export type ProfileStatus = 'draft' | 'submitted' | 'approved'
export type InviteStatus = 'active' | 'used' | 'expired'

export type MemberInvite = {
  id: string
  code: string
  label: string
  status: InviteStatus
  usesLeft: number
  createdAt: string
  expiresAt: string
}

export type MemberProfile = {
  id: string
  name: string
  email: string
  password: string
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
}

export type MemberHubState = {
  invites: MemberInvite[]
  members: MemberProfile[]
  currentMemberId?: string
  opportunities: HubOpportunity[]
  featureSubmissions: MemberFeatureSubmission[]
  notifications: MemberNotification[]
}

const STORAGE_KEY = 'top100afl-member-hub-v1'

const seedState: MemberHubState = {
  invites: [
    {
      id: 'invite-seed-1',
      code: 'AFL-247819',
      label: 'Awardee invite',
      status: 'active',
      usesLeft: 1,
      createdAt: '2026-06-15T00:00:00.000Z',
      expiresAt: '2026-12-31T23:59:59.999Z',
    },
    {
      id: 'invite-seed-2',
      code: 'AFL-311560',
      label: 'Awardee invite',
      status: 'active',
      usesLeft: 1,
      createdAt: '2026-06-15T00:00:00.000Z',
      expiresAt: '2026-12-31T23:59:59.999Z',
    },
  ],
  members: [
    {
      id: 'member-samuel',
      name: 'Samuel Adebayo',
      email: 'samuel@top100afl.test',
      password: 'demo12345',
      inviteCode: 'AFL-DEMO',
      publicSlug: 'samuel-adebayo',
      status: 'approved',
      profileStatus: 'approved',
      headline: 'Climate founder and Top100 Africa Future Leader',
      bio: 'Building practical climate solutions with youth communities across West Africa.',
      location: 'Lagos, Nigeria',
      organization: 'GreenBridge Labs',
      field: 'Climate innovation',
      avatarInitials: 'SA',
      recruiterVisible: true,
      emailVisible: true,
      showInDirectory: true,
      allowDirectMessages: true,
      opportunityAlerts: true,
      magazineAlerts: true,
      messageAlerts: true,
      eventReminders: true,
      hideEmailFromRecruiters: false,
      requireProfileApproval: true,
      securityEmails: true,
      bioUpdateCount: 0,
      bioUpdateLimit: 2,
      createdAt: '2026-06-10T00:00:00.000Z',
    },
  ],
  currentMemberId: 'member-samuel',
  opportunities: [
    {
      id: 'opp-1',
      title: 'Youth Climate Fellowship',
      type: 'Fellowship',
      location: 'Hybrid',
      deadline: 'Jul 30',
    },
    {
      id: 'opp-2',
      title: 'Founder Mentorship Sprint',
      type: 'Mentorship',
      location: 'Remote',
      deadline: 'Aug 12',
    },
    {
      id: 'opp-3',
      title: 'Africa Innovation Grant',
      type: 'Grant',
      location: 'Pan-African',
      deadline: 'Aug 28',
    },
    {
      id: 'opp-4',
      title: 'Leadership Story Residency',
      type: 'Residency',
      location: 'Lagos',
      deadline: 'Sep 04',
    },
    {
      id: 'opp-5',
      title: 'Women in Tech Accelerator',
      type: 'Accelerator',
      location: 'Remote',
      deadline: 'Sep 15',
    },
    {
      id: 'opp-6',
      title: 'Research and Policy Internship',
      type: 'Internship',
      location: 'Hybrid',
      deadline: 'Oct 03',
    },
  ],
  featureSubmissions: [
    {
      id: 'feature-seed-1',
      memberId: 'member-samuel',
      memberName: 'Samuel Adebayo',
      title: 'Climate founder profile',
      category: 'bio',
      summary: 'Request to feature Samuel’s climate innovation BIO in the next magazine spotlight.',
      contactEmail: 'samuel@top100afl.test',
      status: 'pending',
      createdAt: '2026-06-15T00:00:00.000Z',
    },
  ],
  notifications: [
    {
      id: 'notification-seed-1',
      title: 'Welcome to the member hub',
      message: 'Complete your BIO, browse awardees, and watch for new opportunities from admin.',
      audience: 'all',
      status: 'sent',
      createdAt: '2026-06-15T00:00:00.000Z',
      readBy: [],
    },
  ],
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function createId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10)

  return `${prefix}-${value}`
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AF'
}

function normalizeMember(member: MemberProfile): MemberProfile {
  return {
    ...member,
    bioUpdateCount: Number.isFinite(member.bioUpdateCount) ? member.bioUpdateCount : 0,
    bioUpdateLimit: Number.isFinite(member.bioUpdateLimit) ? member.bioUpdateLimit : 2,
    showInDirectory: member.showInDirectory ?? true,
    allowDirectMessages: member.allowDirectMessages ?? true,
    opportunityAlerts: member.opportunityAlerts ?? true,
    magazineAlerts: member.magazineAlerts ?? true,
    messageAlerts: member.messageAlerts ?? true,
    eventReminders: member.eventReminders ?? true,
    hideEmailFromRecruiters: member.hideEmailFromRecruiters ?? false,
    requireProfileApproval: member.requireProfileApproval ?? true,
    securityEmails: member.securityEmails ?? true,
    publicSlug: member.publicSlug || member.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  }
}

function normalizeState(state: MemberHubState): MemberHubState {
  return {
    ...state,
    members: state.members.map(normalizeMember),
    featureSubmissions: state.featureSubmissions || [],
    notifications: state.notifications || [],
  }
}

function profilePatchHasRealChange(member: MemberProfile, patch: Partial<MemberProfile>) {
  return ([
    'headline',
    'bio',
    'location',
    'organization',
    'field',
    'recruiterVisible',
    'emailVisible',
  ] as const).some((key) => patch[key] !== undefined && patch[key] !== member[key])
}

export function getMemberHubState(): MemberHubState {
  if (!canUseStorage()) return normalizeState(seedState)

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    const normalizedSeed = normalizeState(seedState)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSeed))
    return normalizedSeed
  }

  try {
    const normalized = normalizeState(JSON.parse(stored) as MemberHubState)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  } catch {
    const normalizedSeed = normalizeState(seedState)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedSeed))
    return normalizedSeed
  }
}

export function saveMemberHubState(state: MemberHubState) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function generateInviteCode(label = 'Awardee invite') {
  const state = getMemberHubState()
  const digits = Math.floor(100000 + Math.random() * 900000)
  const invite: MemberInvite = {
    id: createId('invite'),
    code: `AFL-${digits}`,
    label,
    status: 'active',
    usesLeft: 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  }

  saveMemberHubState({ ...state, invites: [invite, ...state.invites] })
  return invite
}

export function registerInviteMember(input: {
  name: string
  email: string
  password: string
  inviteCode: string
  headline?: string
}) {
  const state = getMemberHubState()
  const normalizedCode = input.inviteCode.trim().toUpperCase()
  const invite = state.invites.find((item) => item.code.toUpperCase() === normalizedCode)

  if (!invite || invite.status !== 'active' || invite.usesLeft < 1) {
    throw new Error('Invite code is invalid or already used.')
  }

  if (state.members.some((member) => member.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('This email already has a member profile.')
  }

  const member: MemberProfile = {
    id: createId('member'),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    password: input.password,
    inviteCode: invite.code,
    status: 'pending',
    profileStatus: 'submitted',
    headline: input.headline?.trim() || 'Top100 Africa Future Leaders awardee',
    bio: '',
    location: '',
    organization: '',
    field: '',
    avatarInitials: getInitials(input.name),
    recruiterVisible: true,
    emailVisible: false,
    showInDirectory: true,
    allowDirectMessages: true,
    opportunityAlerts: true,
    magazineAlerts: true,
    messageAlerts: true,
    eventReminders: true,
    hideEmailFromRecruiters: false,
    requireProfileApproval: true,
    securityEmails: true,
    bioUpdateCount: 0,
    bioUpdateLimit: 2,
    createdAt: new Date().toISOString(),
  }

  const invites = state.invites.map((item) =>
    item.id === invite.id
      ? { ...item, status: 'used' as const, usesLeft: 0 }
      : item,
  )

  const nextState = {
    ...state,
    invites,
    members: [member, ...state.members],
    currentMemberId: member.id,
  }

  saveMemberHubState(nextState)
  return member
}

export function updateMemberProfile(memberId: string, patch: Partial<MemberProfile>) {
  const state = getMemberHubState()
  const existingMember = state.members.find((member) => member.id === memberId)

  if (!existingMember) {
    throw new Error('Member profile was not found.')
  }

  const hasRealChange = profilePatchHasRealChange(existingMember, patch)
  const nextUpdateCount = hasRealChange ? existingMember.bioUpdateCount + 1 : existingMember.bioUpdateCount

  if (hasRealChange && nextUpdateCount > existingMember.bioUpdateLimit) {
    throw new Error('BIO update limit reached. Ask admin to reset your update access.')
  }

  const nextState = {
    ...state,
    members: state.members.map((member) =>
      member.id === memberId
        ? {
            ...member,
            ...patch,
            bioUpdateCount: nextUpdateCount,
            profileStatus: patch.profileStatus || (hasRealChange ? 'submitted' : member.profileStatus),
          }
        : member,
    ),
  }

  saveMemberHubState(nextState)
  return nextState.members.find((member) => member.id === memberId)
}

export function resetMemberBioUpdateLimit(memberId: string) {
  const state = getMemberHubState()
  const nextState = {
    ...state,
    members: state.members.map((member) =>
      member.id === memberId
        ? { ...member, bioUpdateCount: 0 }
        : member,
    ),
  }

  saveMemberHubState(nextState)
  return nextState
}

export function updateMemberStatus(memberId: string, status: MemberStatus) {
  const state = getMemberHubState()
  const nextState = {
    ...state,
    members: state.members.map((member) =>
      member.id === memberId
        ? {
            ...member,
            status,
            profileStatus: status === 'approved' ? 'approved' : member.profileStatus,
          }
        : member,
    ),
  }

  saveMemberHubState(nextState)
  return nextState
}

export function setCurrentMember(memberId: string) {
  const state = getMemberHubState()
  saveMemberHubState({ ...state, currentMemberId: memberId })
}

export function createFeatureSubmission(input: Omit<MemberFeatureSubmission, 'id' | 'createdAt' | 'status'>) {
  const state = getMemberHubState()
  const submission: MemberFeatureSubmission = {
    ...input,
    id: createId('feature'),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  saveMemberHubState({
    ...state,
    featureSubmissions: [submission, ...state.featureSubmissions],
  })

  return submission
}

export function updateFeatureSubmissionStatus(id: string, status: MemberFeatureSubmission['status']) {
  const state = getMemberHubState()
  const nextState = {
    ...state,
    featureSubmissions: state.featureSubmissions.map((submission) =>
      submission.id === id ? { ...submission, status } : submission,
    ),
  }

  saveMemberHubState(nextState)
  return nextState
}

export function createMemberNotification(input: Pick<MemberNotification, 'title' | 'message' | 'audience'>) {
  const state = getMemberHubState()
  const notification: MemberNotification = {
    ...input,
    id: createId('notification'),
    status: 'sent',
    createdAt: new Date().toISOString(),
    readBy: [],
  }

  saveMemberHubState({
    ...state,
    notifications: [notification, ...state.notifications],
  })

  return notification
}

export function markNotificationRead(notificationId: string, memberId: string) {
  const state = getMemberHubState()
  const nextState = {
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.id === notificationId
        ? {
            ...notification,
            readBy: notification.readBy.includes(memberId)
              ? notification.readBy
              : [...notification.readBy, memberId],
          }
        : notification,
    ),
  }

  saveMemberHubState(nextState)
  return nextState
}
