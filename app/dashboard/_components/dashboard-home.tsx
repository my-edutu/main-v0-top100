'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  ArrowUpRight,
  CalendarDays,
  MessageCircle,
  Sparkles,
  Trophy,
  UserRound,
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
import { DashboardCard } from './dashboard-card'
import { discoverNav, meNav } from '../_lib/navigation'
import { selectUpcomingInvitations } from '../_lib/home-priority'
import { useDashboardBadges } from '../_providers/dashboard-badges'
import { useDashboardMember } from '../_providers/dashboard-member'
import { AwardReadyWelcome } from './award-ready-welcome'

type RecentItem = {
  id: string
  kind: 'message' | 'update'
  title: string
  description: string
  date: string
  href: string
  unread: boolean
}

const INTERVIEW_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSc-UAJ-UamjE4Lqa8fwv3Z9qNGebRZS8AZYLMAKNbKs4IJD5A/viewform'

const shortcutDescriptions: Record<string, string> = {
  Members: 'Meet fellow awardees',
  Opportunities: 'Find your next opening',
  Profile: 'Keep your BIO current',
  'My award': 'Pay your award fee securely',
  'Portfolio cover': 'Create your magazine profile',
  Posts: 'Write in your own words',
  'Get featured': 'Share your work with the team',
  'Schedule an interview': 'Email the team to arrange a time',
  'Contact the team': 'Ask a question or get support',
  'Partner with us': 'Explore working together',
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
    setUnreadMessages,
    setUnreadUpdates,
  } = useDashboardBadges()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [invitations, setInvitations] = useState<EventInvitation[]>([])
  const [notifications, setNotifications] = useState<MemberNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let inFlight = false

    async function loadPreviews() {
      if (inFlight) return
      inFlight = true
      const [conversationResult, invitationResult, hubResult] =
        await Promise.allSettled([
          fetchConversations(),
          fetchEventInvitations(),
          fetchMemberHubState(),
        ])

      inFlight = false
      if (cancelled) return
      setLoading(false)
      setLoadError([conversationResult, invitationResult, hubResult].some(result => result.status === 'rejected'))

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

  const showAwardWelcome = awardNeedsAttention

  const shortcuts = [discoverNav[0], discoverNav[2], meNav[0], meNav[1], meNav[4],
    { label:'Schedule an interview', href:INTERVIEW_FORM_URL, icon:MessageCircle, color:'ember' as const, external: true },
    { label:'Contact the team', href:'mailto:info@top100afl.com', icon:MessageCircle, color:'forest' as const },
    { label:'Partner with us', href:'/partnership', icon:UserRound, color:'cobalt' as const },
  ]

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
        cover: invitation.event?.cover ?? null,
        href: '/dashboard/discover/events',
      }))

    return datedInvitations
  }, [invitations])

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
      {showAwardWelcome ? <AwardReadyWelcome memberId={member.id} name={member.name} /> : null}
      <section className="hub-welcome" aria-labelledby="hub-welcome-title">
        <h1 id="hub-welcome-title">{(member.dashboardLoginCount ?? 0) < 4 ? 'Congratulations' : 'Hey'}, {member.name.trim().split(/\s+/)[0]}.</h1>
        <p className="hub-welcome-description">Your people, opportunities, and latest updates.</p>
      </section>
      {loading && <p role="status" className="hub-status text-sm text-neutral-600">Loading your latest activity…</p>}
      {loadError && <p role="status" className="hub-status rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm leading-5 text-neutral-700">Some activity couldn’t load. We’ll retry automatically; you can also open Messages, Events, or Updates directly.</p>}

      {awardNeedsAttention ? (
        <section className="hub-next-move" aria-labelledby="next-move-title">
          <p id="next-move-title" className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#625B52]">
            Your next move
          </p>
          <DashboardCard
            image={false}
            href="/dashboard/me/award"
            title="Your award is ready"
            description="Pay the award fee with Bachs; delivery follows separately."
            icon={Trophy}
            color="saffron"
            compact
          />
        </section>
      ) : null}

      <section aria-labelledby="coming-up-title" className="hub-upcoming-events min-w-0 md:order-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="coming-up-title" className="hub-panel-title">Upcoming events</h2>
          </div>
          <CalendarDays className="h-6 w-6 text-[#171717]" aria-hidden="true" />
        </div>
        <div className="hub-events-rail mt-3" tabIndex={0} role="region" aria-label="Upcoming events, scroll horizontally">
          {comingUp.length > 0 ? comingUp.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="hub-upcoming-event focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
              style={item.cover ? { backgroundImage: `linear-gradient(180deg, rgba(12,12,16,.08) 15%, rgba(12,12,16,.88) 100%), url(${item.cover})` } : undefined}
            >
              <span className="relative z-10 min-w-0 self-end text-white">
                <span className="block break-words text-sm font-semibold text-white">{item.title}</span>
                <span className="mt-0.5 block truncate text-xs font-normal text-white/80">{item.detail}</span>
              </span>
              <span className="relative z-10 text-xs font-medium text-white/90">{item.date}</span>
            </Link>
          )) : (
            <div className="py-3"><p className="text-sm text-[#625B52]">No upcoming events yet.</p><Link className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-[#171717]" href="/dashboard/discover/events">View events <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          )}
        </div>
      </section>

      <section className="hub-shortcuts" aria-labelledby="shortcuts-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="shortcuts-title" className="hub-panel-title">Explore more</h2>
          <Sparkles className="h-5 w-5 text-[#171717]" aria-hidden="true" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {shortcuts.map((item) => (
            <DashboardCard
              image={false}
              key={item.href}
              href={item.href}
              title={item.label}
              description={shortcutDescriptions[item.label]}
              icon={item.icon}
              color={item.color}
              external={'external' in item ? item.external : undefined}
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
                    ? 'bg-orange-100 text-orange-900'
                    : 'bg-amber-100 text-amber-900',
                )}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{item.title}</span>
                    {item.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#171717]" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-normal text-[#625B52]">{item.description}</span>
                </span>
                <span className="hidden shrink-0 text-[11px] font-medium text-[#625B52] sm:block">{formatShortDate(item.date)}</span>
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
