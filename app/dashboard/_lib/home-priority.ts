import type { MemberProfile } from '@/lib/member-hub'

import type { DashboardColor } from './navigation'

type HomePriorityMember = Pick<
  MemberProfile,
  | 'status'
  | 'profileStatus'
  | 'bio'
  | 'headline'
  | 'bioUpdateCount'
  | 'bioUpdateLimit'
>

type HomePriorityInput = {
  member: HomePriorityMember
  awardNeedsAttention: boolean
  unreadMessages: number
  unreadUpdates: number
}

export type HomePriority = {
  kind: 'membership' | 'bio' | 'award' | 'messages' | 'updates' | 'discover'
  title: string
  description: string
  href: string
  color: DashboardColor
}

export function selectHomePriority({
  member,
  awardNeedsAttention,
  unreadMessages,
  unreadUpdates,
}: HomePriorityInput): HomePriority {
  if (member.status !== 'approved') {
    return {
      kind: 'membership',
      title: 'Review your membership',
      description: 'See your current status and keep your member details ready.',
      href: '/dashboard/me',
      color: 'charcoal',
    }
  }

  if (
    member.profileStatus !== 'approved' ||
    !member.bio.trim() ||
    !member.headline.trim()
  ) {
    const updatesRemaining = Math.max(
      0,
      member.bioUpdateLimit - member.bioUpdateCount,
    )

    return {
      kind: 'bio',
      title: 'Complete your BIO',
      description: `${updatesRemaining} profile ${updatesRemaining === 1 ? 'update' : 'updates'} remaining. Finish your story for the network.`,
      href: '/dashboard/me/profile',
      color: 'forest',
    }
  }

  if (awardNeedsAttention) {
    return {
      kind: 'award',
      title: 'Claim your AFL award',
      description: 'Add your delivery details and continue your award journey.',
      href: '/dashboard/me/award',
      color: 'ember',
    }
  }

  if (unreadMessages > 0) {
    return {
      kind: 'messages',
      title: 'Reply to your messages',
      description: `${unreadMessages} unread ${unreadMessages === 1 ? 'conversation is' : 'conversations are'} waiting for you.`,
      href: '/dashboard/messages',
      color: 'cobalt',
    }
  }

  if (unreadUpdates > 0) {
    return {
      kind: 'updates',
      title: 'Catch up on member updates',
      description: `${unreadUpdates} unread ${unreadUpdates === 1 ? 'update' : 'updates'} from the AFL team.`,
      href: '/dashboard/updates',
      color: 'saffron',
    }
  }

  return {
    kind: 'discover',
    title: 'Explore the network',
    description: 'Meet awardees, find groups and browse fresh opportunities.',
    href: '/dashboard/discover',
    color: 'burgundy',
  }
}
