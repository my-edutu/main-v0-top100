'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  ArrowUpRight,
  X,
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
  type MemberNotification,
} from '@/lib/member-hub'
import {
  fetchEventInvitations,
  type EventInvitation,
} from '@/lib/events/invitations-client'
import { cn } from '@/lib/utils'
import { selectHomeOpportunities } from '@/lib/dashboard/home-opportunities'
import { fetchMemberOpportunities } from '@/lib/opportunities/client'
import {
  formatDeadlineDate,
  type Opportunity,
} from '@/lib/opportunities/types'
import { DashboardCard } from './dashboard-card'
import { discoverNav, meNav } from '../_lib/navigation'
import {
  selectHomePriority,
  selectUpcomingInvitations,
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
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [profileDismissed, setProfileDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPreviews() {
      const [conversationResult, invitationResult, hubResult, opportunityResult] =
        await Promise.allSettled([
          fetchConversations(),
          fetchEventInvitations(),
          fetchMemberHubState(),
          fetchMemberOpportunities(),
        ])

      if (cancelled) return
      setLoading(false)
      setLoadError([conversationResult, invitationResult, hubResult, opportunityResult].some(result => result.status === 'rejected'))

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
        setUnreadUpdates(
          visibleNotifications.filter(
            (notification) => !notification.readBy.includes(member.id),
          ).length,
        )
      }

      if (opportunityResult.status === 'fulfilled') {
        setOpportunities(selectHomeOpportunities(opportunityResult.value))
      }
    }

    void loadPreviews()
    const refresh = () => { if (!document.hidden) void loadPreviews() }
    window.addEventListener('focus', refresh)
    const interval = window.setInterval(refresh, 30000)

    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      window.clearInterval(interval)
    }
  }, [member.id, member.status, setUnreadMessages, setUnreadUpdates])

  const profileNeedsAttention = !member.headline.trim() || !member.bio.trim() || member.profileStatus === 'draft'
  const priority = selectHomePriority({
    member,
    awardNeedsAttention,
    unreadMessages,
    unreadUpdates,
  })
  const PriorityIcon = priorityIcons[priority.kind]

  const shortcuts = [discoverNav[0], discoverNav[2], meNav[0], meNav[1]]

  const comingUp = useMemo(() => {
    const datedInvitations = selectUpcomingInvitations(invitations)
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
      detail: [opportunity.type, opportunity.location].filter(Boolean).join(' · '),
      date: formatDeadlineDate(opportunity.deadline),
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
        href: `/dashboard/messages/${conversation.id}`,
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
    <div className="hub-home">
      {profileNeedsAttention && !profileDismissed && (
        <aside className="hub-profile-reminder" aria-label="Profile reminder">
          <div>
            <p className="text-sm font-semibold">Let your profile tell your story.</p>
            <Link href="/dashboard/me/profile" className="inline-flex min-h-11 items-center text-xs underline underline-offset-4">Complete your profile</Link>
          </div>
          <button type="button" onClick={() => setProfileDismissed(true)} aria-label="Dismiss profile reminder" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><X size={18} aria-hidden="true" /></button>
        </aside>
      )}
      <section className="hub-welcome" aria-labelledby="hub-welcome-title">
        <h1 id="hub-welcome-title">Hey, {member.name.trim().split(/\s+/)[0]}.</h1>
        <p className="hub-welcome-description">Your people, opportunities, and latest updates.</p>
      </section>
      {loading && <p role="status" className="text-sm text-neutral-600">Loading your latest activity…</p>}
      {loadError && <p role="status" className="text-sm text-neutral-600">Some activity couldn’t load. We’ll retry automatically; you can also open Messages, Events, or Updates directly.</p>}

      <section className="hub-next-move" aria-labelledby="next-move-title">
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

      <section aria-labelledby="coming-up-title" className="hub-panel md:order-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-neutral-600">Calendar</p>
            <h2 id="coming-up-title" className="hub-panel-title mt-1">On your horizon</h2>
          </div>
          <CalendarDays className="h-6 w-6 text-[#171717]" aria-hidden="true" />
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
              <span className="text-xs font-extrabold text-[#171717]">{item.date}</span>
            </Link>
          )) : (
            <div className="hub-empty"><span className="hub-empty-icon" aria-hidden="true"><CalendarDays size={26} strokeWidth={1.5} /></span><div><p className="text-sm font-semibold">A little space for what’s next.</p><p className="mt-1 text-xs leading-5 text-[#625B52]">Your event invitations and opportunity deadlines will land here.</p><Link className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#171717]" href="/dashboard/discover/opportunities">Explore opportunities <ArrowUpRight size={14} aria-hidden="true" /></Link></div></div>
          )}
        </div>
      </section>

      <section className="hub-shortcuts" aria-labelledby="shortcuts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="shortcuts-title" className="hub-panel-title">A little more possibility</h2>
          <Sparkles className="h-5 w-5 text-[#171717]" aria-hidden="true" />
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

      <section aria-labelledby="recent-title" className="hub-panel md:order-5">
        <div className="flex items-center justify-between"><h2 id="recent-title" className="hub-panel-title">In the loop</h2><Link href="/dashboard/updates" className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-[#171717]">All updates <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
        <div className="mt-3 divide-y divide-[#E7DDCF]">
          {recentItems.length > 0 ? recentItems.map((item) => {
            const Icon = item.kind === 'message' ? MessageCircle : BellRing

            return (
              <Link
                key={item.id}
                href={item.href}
                className="flex min-h-16 items-center gap-3 rounded-lg py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171412] focus-visible:ring-offset-2"
              >
                {item.unread ? <span className="sr-only">Unread. </span> : null}
                <span className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  item.kind === 'message'
                    ? 'bg-[#fff3af] text-[#171717]'
                    : 'bg-[#FFE49A] text-[#171717]',
                )}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-extrabold">{item.title}</span>
                    {item.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#171717]" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[#625B52]">{item.description}</span>
                </span>
                <span className="shrink-0 text-[11px] font-bold text-[#625B52]">{formatShortDate(item.date)}</span>
              </Link>
            )
          }) : (
            <div className="hub-empty"><span className="hub-empty-icon" aria-hidden="true"><MessageCircle size={26} strokeWidth={1.5} /></span><div><p className="text-sm font-semibold">Good conversations start with hello.</p><p className="mt-1 text-xs leading-5 text-[#625B52]">Connect with another awardee. Your messages and community updates will appear here.</p><Link href="/dashboard/discover/members" className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-[#171717]">Meet the community <ArrowUpRight size={14} aria-hidden="true" /></Link></div></div>
          )}
        </div>
      </section>
    </div>
  )
}
