'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  CalendarDays,
  Compass,
  MessageCircle,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from 'lucide-react'

import {
  fetchConversations,
  fetchMemberHubState,
  type ConversationSummary,
  type HubOpportunity,
  type MemberNotification,
} from '@/lib/member-hub'
import {
  fetchEventInvitations,
  type EventInvitation,
} from '@/lib/events/invitations-client'
import { cn } from '@/lib/utils'
import { DashboardCard } from './dashboard-card'
import { discoverNav, meNav } from '../_lib/navigation'
import {
  selectHomePriority,
  type HomePriority,
} from '../_lib/home-priority'
import { useDashboardBadges } from '../_providers/dashboard-badges'
import { useDashboardMember } from '../_providers/dashboard-member'

type RecentItem = {
  id: string
  kind: 'message' | 'update'
  title: string
  description: string
  date: string
  href: string
  unread: boolean
}

const priorityIcons: Record<HomePriority['kind'], LucideIcon> = {
  membership: UserRound,
  bio: UserRound,
  award: Trophy,
  messages: MessageCircle,
  updates: BellRing,
  discover: Compass,
}

const shortcutDescriptions: Record<string, string> = {
  Members: 'Meet fellow awardees',
  Opportunities: 'Find your next opening',
  Profile: 'Keep your BIO current',
  'My award': 'Claim or track delivery',
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return 'Date to be announced'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date to be announced'

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  }).format(date)
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function DashboardHome() {
  const { member } = useDashboardMember()
  const {
    awardNeedsAttention,
    unreadMessages,
    unreadUpdates,
    setUnreadMessages,
    setUnreadUpdates,
  } = useDashboardBadges()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [notifications, setNotifications] = useState<MemberNotification[]>([])
  const [opportunities, setOpportunities] = useState<HubOpportunity[]>([])

  useEffect(() => {
    let cancelled = false

    async function loadPreviews() {
      const [conversationResult, invitationResult, hubResult] =
        await Promise.allSettled([
          fetchConversations(),
          fetchEventInvitations(),
          fetchMemberHubState(),
        ])

      if (cancelled) return

      if (conversationResult.status === 'fulfilled') {
        setConversations(conversationResult.value.conversations)
        setUnreadMessages(conversationResult.value.unreadTotal)
      }

      if (invitationResult.status === 'fulfilled') {
        setInvitations(invitationResult.value.invitations)
      }

      if (hubResult.status === 'fulfilled') {
        const visibleNotifications = hubResult.value.notifications.filter(
          (notification) =>
            notification.status === 'sent' &&
            (notification.audience === 'all' || member.status === 'approved'),
        )
        setNotifications(visibleNotifications)
        setOpportunities(hubResult.value.opportunities)
        setUnreadUpdates(
          visibleNotifications.filter(
            (notification) => !notification.readBy.includes(member.id),
          ).length,
        )
      }
    }

    void loadPreviews()

    return () => {
      cancelled = true
    }
  }, [member.id, member.status, setUnreadMessages, setUnreadUpdates])

  const profileSteps = [
    Boolean(member.headline.trim()),
    Boolean(member.bio.trim()),
    member.profileStatus === 'approved',
  ]
  const profileProgress = Math.round(
    (profileSteps.filter(Boolean).length / profileSteps.length) * 100,
  )
  const priority = selectHomePriority({
    member,
    awardNeedsAttention,
    unreadMessages,
    unreadUpdates,
  })
  const PriorityIcon = priorityIcons[priority.kind]

  const shortcuts = [discoverNav[0], discoverNav[2], meNav[0], meNav[1]]

  const comingUp = useMemo(() => {
    const datedInvitations = invitations
      .filter((invitation) => invitation.event)
      .sort((left, right) => {
        const leftDate = left.event?.startAt
          ? new Date(left.event.startAt).getTime()
          : Number.POSITIVE_INFINITY
        const rightDate = right.event?.startAt
          ? new Date(right.event.startAt).getTime()
          : Number.POSITIVE_INFINITY
        return leftDate - rightDate
      })
      .map((invitation) => ({
        id: `invitation-${invitation.id}`,
        title: invitation.event?.title ?? 'Member event',
        detail:
          invitation.rsvp === 'pending'
            ? 'Your RSVP is waiting'
            : `RSVP: ${invitation.rsvp}`,
        date: formatShortDate(invitation.event?.startAt),
        href: '/dashboard/discover/events',
      }))

    const opportunityRows = opportunities.map((opportunity) => ({
      id: `opportunity-${opportunity.id}`,
      title: opportunity.title,
      detail: `${opportunity.type} · ${opportunity.location}`,
      date: opportunity.deadline,
      href: '/dashboard/discover/opportunities',
    }))

    return [...datedInvitations, ...opportunityRows].slice(0, 3)
  }, [invitations, opportunities])

  const recentItems = useMemo<RecentItem[]>(() => {
    const messageRows: RecentItem[] = conversations
      .filter((conversation) => conversation.lastMessage)
      .map((conversation) => ({
        id: `message-${conversation.id}`,
        kind: 'message',
        title: conversation.otherMember.name,
        description: conversation.lastMessage?.body ?? 'Open conversation',
        date: conversation.lastMessageAt,
        href: '/dashboard/messages',
        unread: conversation.unreadCount > 0,
      }))

    const updateRows: RecentItem[] = notifications.map((notification) => ({
      id: `update-${notification.id}`,
      kind: 'update',
      title: notification.title,
      description: notification.message,
      date: notification.createdAt,
      href: '/dashboard/updates',
      unread: !notification.readBy.includes(member.id),
    }))

    return [...messageRows, ...updateRows]
      .sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime(),
      )
      .slice(0, 3)
  }, [conversations, member.id, notifications])

  return (
    <div className="space-y-6">
      <section className="rounded-[20px] border border-[#E7DDCF] bg-white px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#171412] text-xs font-extrabold text-[#FBF7EF]">
            {member.avatarInitials || initialsFromName(member.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-orange-700">
              {member.status === 'approved' ? 'Awardee member' : member.status}
            </p>
            <h1 className="truncate text-2xl font-extrabold leading-tight tracking-tight text-[#171412]">
              Hello, {member.name.split(/\s+/)[0]}.
            </h1>
          </div>
          <span className="shrink-0 text-sm font-extrabold text-[#625B52]">
            {profileProgress}%
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E8EBF0]" aria-label={`Profile ${profileProgress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={profileProgress}>
          <span
            className="block h-full rounded-full bg-[#F36C21] transition-[width] motion-reduce:transition-none"
            style={{ width: `${profileProgress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-[#625B52]">
          <span>Profile completion</span>
          <Link href="/dashboard/me/profile" className="rounded-lg text-[#6C2600] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700">
            Review BIO
          </Link>
        </div>
      </section>

      <section aria-labelledby="next-move-title">
        <p id="next-move-title" className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#625B52]">
          Your next move
        </p>
        <DashboardCard
          href={priority.href}
          title={priority.title}
          description={priority.description}
          icon={PriorityIcon}
          color={priority.color}
          compact
        />
      </section>

      <section aria-labelledby="coming-up-title" className="rounded-[20px] border border-[#E7DDCF] bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-700">Calendar</p>
            <h2 id="coming-up-title" className="mt-1 text-xl font-extrabold tracking-tight">Coming up</h2>
          </div>
          <CalendarDays className="h-6 w-6 text-[#6C2600]" aria-hidden="true" />
        </div>
        <div className="mt-3 divide-y divide-[#E7DDCF]">
          {comingUp.length > 0 ? comingUp.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-extrabold text-[#171412]">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-[#625B52]">{item.detail}</span>
              </span>
              <span className="text-xs font-extrabold text-[#6C2600]">{item.date}</span>
            </Link>
          )) : (
            <p className="py-4 text-sm font-semibold text-[#625B52]">Your invitations and deadlines will appear here.</p>
          )}
        </div>
      </section>

      <section aria-labelledby="shortcuts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="shortcuts-title" className="text-xl font-extrabold tracking-tight">Shortcuts</h2>
          <Sparkles className="h-5 w-5 text-[#9B1C4A]" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {shortcuts.map((item) => (
            <DashboardCard
              key={item.href}
              href={item.href}
              title={item.label}
              description={shortcutDescriptions[item.label]}
              icon={item.icon}
              color={item.color}
              compact
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="recent-title" className="rounded-[20px] border border-[#E7DDCF] bg-white p-4 sm:p-5">
        <h2 id="recent-title" className="text-xl font-extrabold tracking-tight">Recent</h2>
        <div className="mt-3 divide-y divide-[#E7DDCF]">
          {recentItems.length > 0 ? recentItems.map((item) => {
            const Icon = item.kind === 'message' ? MessageCircle : BellRing

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex min-h-16 items-center gap-3 rounded-lg py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171412] focus-visible:ring-offset-2"
              >
                <span className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  item.kind === 'message'
                    ? 'bg-[#DCE8FF] text-[#123A78]'
                    : 'bg-[#FFE49A] text-[#563700]',
                )}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold">{item.title}</span>
                    {item.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#F36C21]" aria-label="Unread" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[#625B52]">{item.description}</span>
                </span>
                <span className="shrink-0 text-[11px] font-bold text-[#625B52]">{formatShortDate(item.date)}</span>
              </Link>
            )
          }) : (
            <p className="py-4 text-sm font-semibold text-[#625B52]">New messages and AFL updates will appear here.</p>
          )}
        </div>
      </section>
    </div>
  )
}
