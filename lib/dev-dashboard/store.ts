import type { AwardOrder } from '@/lib/awards'
import type { EventInvitation } from '@/lib/events/invitations-client'
import type { GroupMessageView, GroupSummary } from '@/lib/groups/types'
import type {
  ConversationSummary,
  DirectMessage,
  MemberFeatureSubmission,
  MemberNotification,
  MemberProfile,
} from '@/lib/member-hub'
import type { MemberPost } from '@/lib/member-posts/types'
import type { Opportunity } from '@/lib/opportunities/types'
import type { AwardeeDirectoryEntry } from '@/types/profile'
import type { PortfolioCoverGeneration } from '@/lib/portfolio-cover/types'

export const DEMO_MEMBER_ID = 'demo-member-1'
export const DEMO_PUBLIC_SLUG = 'amara-okafor-demo'

export type DemoConversation = {
  summary: ConversationSummary
  messages: DirectMessage[]
}

export type DemoGroup = {
  summary: GroupSummary
  messages: GroupMessageView[]
  pendingMembers: Array<Record<string, unknown>>
}

export type DemoDashboardStore = {
  profile: MemberProfile
  notifications: MemberNotification[]
  featureSubmissions: MemberFeatureSubmission[]
  posts: MemberPost[]
  conversations: DemoConversation[]
  groups: DemoGroup[]
  opportunities: Opportunity[]
  invitations: EventInvitation[]
  awardOrder: AwardOrder | null
  portfolioCover: PortfolioCoverGeneration | null
  sequence: number
}

const createdAt = '2026-08-01T09:00:00.000Z'

export function createDemoDashboardStore(): DemoDashboardStore {
  return {
    profile: {
      id: DEMO_MEMBER_ID,
      name: 'Amara Okafor',
      email: 'demo@top100.local',
      inviteCode: 'LOCAL-DEMO',
      awardeeId: 'demo-awardee-1',
      publicSlug: DEMO_PUBLIC_SLUG,
      status: 'approved',
      profileStatus: 'approved',
      headline: 'Climate-tech founder and community builder',
      bio: 'Amara builds practical climate tools for growing African cities and mentors early-stage founders across the continent.',
      location: 'Lagos, Nigeria',
      organization: 'GreenGrid Africa',
      field: 'Climate Technology',
      avatarInitials: 'AO',
      recruiterVisible: true,
      emailVisible: false,
      showInDirectory: true,
      allowDirectMessages: true,
      opportunityAlerts: true,
      magazineAlerts: true,
      messageAlerts: true,
      eventReminders: true,
      hideEmailFromRecruiters: true,
      requireProfileApproval: false,
      securityEmails: true,
      bioUpdateCount: 0,
      bioUpdateLimit: 20,
      createdAt,
    },
    notifications: [
      {
        id: 'demo-notification-1',
        title: 'Welcome to your awardee workspace',
        message: 'Your profile is ready. Explore the community and update your BIO.',
        audience: 'approved',
        status: 'sent',
        createdAt: '2026-08-10T10:00:00.000Z',
        readBy: [],
        category: 'member',
        ctaLabel: 'Update BIO',
        ctaUrl: '/dashboard/me/profile',
      },
      {
        id: 'demo-notification-2',
        title: 'New fellowship added',
        message: 'The Pan-African Climate Fellowship is now accepting applications.',
        audience: 'approved',
        status: 'sent',
        createdAt: '2026-08-09T14:30:00.000Z',
        readBy: [DEMO_MEMBER_ID],
        category: 'opportunity',
        ctaLabel: 'View opportunity',
        ctaUrl: '/dashboard/discover/opportunities',
      },
    ],
    featureSubmissions: [],
    posts: [
      {
        id: 'demo-post-1',
        slug: 'building-for-resilient-cities',
        title: 'Building for resilient African cities',
        excerpt: 'Three lessons from shipping climate tools with local communities.',
        body: 'The best climate products start with the people who understand the problem first-hand. This post captures three lessons from our field work.',
        coverUrl: null,
        tags: ['Climate', 'Leadership'],
        status: 'published',
        moderationNote: null,
        publishedAt: '2026-08-05T08:00:00.000Z',
        viewCount: 184,
        createdAt: '2026-08-04T16:00:00.000Z',
        updatedAt: '2026-08-05T08:00:00.000Z',
      },
    ],
    conversations: [
      {
        summary: {
          id: 'demo-conversation-1',
          otherMember: {
            id: 'demo-member-2',
            name: 'Kwame Mensah',
            headline: 'Founder, Civic Labs',
            slug: 'kwame-mensah-demo',
            avatarUrl: null,
            initials: 'KM',
          },
          lastMessage: {
            body: 'Would you like to join the roundtable next week?',
            mine: false,
            createdAt: '2026-08-10T16:25:00.000Z',
          },
          unreadCount: 1,
          lastMessageAt: '2026-08-10T16:25:00.000Z',
        },
        messages: [
          {
            id: 'demo-message-1',
            conversationId: 'demo-conversation-1',
            senderId: 'demo-member-2',
            mine: false,
            body: 'Would you like to join the roundtable next week?',
            createdAt: '2026-08-10T16:25:00.000Z',
            readAt: null,
          },
        ],
      },
    ],
    groups: [
      {
        summary: {
          id: 'demo-group-1',
          slug: 'climate-innovators',
          name: 'Climate Innovators',
          description: 'Awardees building practical responses to climate challenges.',
          topic: 'Climate',
          coverUrl: null,
          visibility: 'open',
          isArchived: false,
          memberCount: 48,
          createdAt: '2026-07-20T09:00:00.000Z',
          membership: { role: 'member', status: 'active', unreadCount: 1 },
        },
        messages: [
          {
            id: 'demo-group-message-1',
            groupId: 'demo-group-1',
            authorId: 'demo-member-2',
            authorName: 'Kwame Mensah',
            authorInitials: 'KM',
            mine: false,
            body: 'Sharing the agenda for our founder showcase this Friday.',
            isDeleted: false,
            createdAt: '2026-08-10T12:00:00.000Z',
          },
        ],
        pendingMembers: [],
      },
      {
        summary: {
          id: 'demo-group-2',
          slug: 'future-of-work-africa',
          name: 'Future of Work Africa',
          description: 'Ideas and opportunities shaping work across the continent.',
          topic: 'Future of Work',
          coverUrl: null,
          visibility: 'open',
          isArchived: false,
          memberCount: 73,
          createdAt: '2026-07-18T09:00:00.000Z',
          membership: null,
        },
        messages: [],
        pendingMembers: [],
      },
    ],
    opportunities: [
      {
        id: 'demo-opportunity-1',
        title: 'Pan-African Climate Fellowship',
        slug: 'pan-african-climate-fellowship',
        type: 'Fellowship',
        organization: 'Africa Climate Network',
        location: 'Hybrid',
        summary: 'A six-month fellowship for founders scaling climate solutions.',
        description: 'Join a cohort of builders receiving mentorship, peer support, and catalytic funding.',
        applicationUrl: 'https://example.com/climate-fellowship',
        contactEmail: null,
        deadline: '2026-09-30',
        amountNote: 'Up to $10,000 in project support',
        visibility: 'approved',
        isFeatured: true,
        status: 'published',
        isSaved: false,
        createdAt: '2026-08-07T08:00:00.000Z',
        updatedAt: '2026-08-07T08:00:00.000Z',
      },
      {
        id: 'demo-opportunity-2',
        title: 'Emerging Leaders Mentorship Sprint',
        slug: 'emerging-leaders-mentorship-sprint',
        type: 'Mentorship',
        organization: 'Top100 Africa',
        location: 'Remote',
        summary: 'Four focused weeks with an experienced African operator.',
        description: 'A practical mentorship sprint designed around one current leadership challenge.',
        applicationUrl: 'https://example.com/mentorship',
        contactEmail: null,
        deadline: '2026-10-15',
        amountNote: null,
        visibility: 'members',
        isFeatured: false,
        status: 'published',
        isSaved: true,
        createdAt: '2026-08-06T08:00:00.000Z',
        updatedAt: '2026-08-06T08:00:00.000Z',
      },
    ],
    invitations: [
      {
        id: 'demo-invitation-1',
        eventId: 'demo-event-1',
        rsvp: 'pending',
        rsvpAt: null,
        seenAt: null,
        message: 'You are invited to join the awardee founders roundtable.',
        createdAt: '2026-08-09T10:00:00.000Z',
        event: {
          id: 'demo-event-1',
          title: 'Awardee Founders Roundtable',
          summary: 'A private conversation on scaling mission-led companies.',
          startAt: '2026-09-12T15:00:00.000Z',
          location: 'Lagos & online',
          cover: null,
          registrationUrl: 'https://example.com/roundtable',
          registrationLabel: 'Event details',
        },
      },
    ],
    awardOrder: null,
    portfolioCover: null,
    sequence: 100,
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __top100DemoDashboardStore: DemoDashboardStore | undefined
}

export function getDemoDashboardStore(): DemoDashboardStore {
  if (!globalThis.__top100DemoDashboardStore) {
    globalThis.__top100DemoDashboardStore = createDemoDashboardStore()
  }
  return globalThis.__top100DemoDashboardStore
}

export function demoAwardeeDirectoryEntry(
  store: DemoDashboardStore,
): AwardeeDirectoryEntry {
  const { profile } = store
  const country = profile.location.split(',').at(-1)?.trim() || null

  return {
    awardee_id: profile.awardeeId ?? 'demo-awardee-1',
    profile_id: profile.id,
    slug: profile.publicSlug ?? DEMO_PUBLIC_SLUG,
    name: profile.name,
    email: profile.emailVisible ? profile.email : null,
    country,
    current_school: null,
    field_of_study: profile.field || null,
    bio: profile.bio || null,
    avatar_url: null,
    cover_image_url: null,
    portfolio_cover_url: store.portfolioCover?.selectedUrl ?? null,
    headline: profile.headline || null,
    tagline: profile.organization || null,
    location: profile.location || null,
    achievements: [],
    gallery: [],
    video_links: [],
    social_links: {},
    interests: profile.field ? [profile.field] : [],
    cohort: 'Top100 Africa Future Leaders demo',
    metadata: { local_demo: true },
    year: 2026,
    featured: false,
    is_public: profile.showInDirectory,
    role: 'user',
  }
}
