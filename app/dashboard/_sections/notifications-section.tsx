'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BellRing, Check, CheckCheck, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { DashboardLoading } from '../_components/dashboard-loading'
import { Button } from '@/components/ui/button'
import {
  fetchMemberHubState,
  markAllNotificationsRead,
  markNotificationRead,
  type MemberNotification,
} from '@/lib/member-hub'
import { cn } from '@/lib/utils'
import { AFL_2026_CALENDAR } from '@/lib/events/afl-2026-calendar'
import {
  isNotificationMarkingDisabled,
  markNotificationReadInList,
  notificationUnreadCount,
} from '../_lib/notifications'
import { useDashboardBadges } from '../_providers/dashboard-badges'
import { useDashboardMember } from '../_providers/dashboard-member'

function formatNotificationDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function displayNotificationDate(notification: MemberNotification, memberCreatedAt: string) {
  return notification.title === 'Welcome to your awardee workspace'
    ? memberCreatedAt
    : notification.createdAt
}

export function NotificationsSection() {
  const { member, notifications: initialNotifications, loadedAt, replaceNotifications } = useDashboardMember()
  const { setUnreadUpdates } = useDashboardBadges()
  const [notifications, setNotifications] = useState<MemberNotification[]>(() => initialNotifications.filter(notification => notification.status === 'sent' && (notification.audience === 'all' || member.status === 'approved')))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [marking, setMarking] = useState<string | 'all' | null>(null)

  const loadNotifications = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    setError('')
    try {
      const state = await fetchMemberHubState()
      const visible = state.notifications.filter(
        (notification) =>
          notification.status === 'sent' &&
          (notification.audience === 'all' || member.status === 'approved'),
      )
      setNotifications(visible)
      replaceNotifications(visible)
      setUnreadUpdates(notificationUnreadCount(visible, member.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your updates.')
    } finally {
      setLoading(false)
    }
  }, [member.id, member.status, replaceNotifications, setUnreadUpdates])

  useEffect(() => {
    setNotifications(initialNotifications.filter(notification => notification.status === 'sent' && (notification.audience === 'all' || member.status === 'approved')))
  }, [initialNotifications, member.status])

  useEffect(() => {
    // Keep recent hub data immediately visible; refresh older updates quietly.
    if (Date.now() - loadedAt > 60_000) void loadNotifications(true)
  }, [loadedAt, loadNotifications])

  const unreadCount = useMemo(
    () => notificationUnreadCount(notifications, member.id),
    [member.id, notifications],
  )

  async function markOne(notificationId: string) {
    try {
      setMarking(notificationId)
      await markNotificationRead(notificationId)
      const next = markNotificationReadInList(
        notifications,
        member.id,
        notificationId,
      )
      setNotifications(next)
      replaceNotifications(next)
      setUnreadUpdates(notificationUnreadCount(next, member.id))
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not mark this update read.')
    } finally {
      setMarking(null)
    }
  }

  async function markAll() {
    try {
      setMarking('all')
      await markAllNotificationsRead()
      const next = markNotificationReadInList(notifications, member.id, 'all')
      setNotifications(next)
      replaceNotifications(next)
      setUnreadUpdates(0)
      toast.success('All updates marked as read.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not mark all updates read.')
    } finally {
      setMarking(null)
    }
  }

  if (loading) return <DashboardLoading label="Loading member updates" />

  if (error && notifications.length === 0) {
    return (
      <section role="alert" className="rounded-[20px] border border-rose-200 bg-white p-5">
        <p className="text-sm font-bold text-rose-800">{error}</p>
        <Button type="button" variant="outline" onClick={() => void loadNotifications()} className="mt-4 min-h-11 rounded-xl border-orange-300 bg-orange-50 font-medium text-orange-900 hover:bg-orange-100 hover:text-orange-950">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Retry
        </Button>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {error && <p role="status" className="text-sm text-orange-800">Updates couldn’t refresh. Your last loaded messages are shown. <button type="button" className="underline" onClick={() => void loadNotifications(true)}>Try again</button></p>}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#E8E4DD] pb-4">
        <div>
          <p className="text-sm font-medium text-[#27241F]">
            {unreadCount > 0 ? `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'}` : 'You’re all caught up'}
          </p>
          <p className="mt-1 text-xs leading-5 text-[#716B62]">
            {notifications.length > 0
              ? `${notifications.length} ${notifications.length === 1 ? 'message' : 'messages'} from the AFL team`
              : 'New messages from the AFL team will appear here.'}
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button type="button" variant="ghost" disabled={marking !== null} onClick={() => void markAll()} className="min-h-11 rounded-lg px-3 font-medium text-[#8A350C] hover:bg-orange-50 hover:text-[#6C2600]">
            {marking === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
            Mark all read
          </Button>
        ) : null}
      </div>

      {notifications.length > 0 ? (
        <ul className="space-y-3" aria-label="Member updates">
          {notifications.map((notification) => {
            const unread = !notification.readBy.includes(member.id)
            return (
              <li key={notification.id} className={cn('relative overflow-hidden rounded-2xl border bg-white transition-colors', unread ? 'border-[#E9C9AE]' : 'border-[#E8E4DD]')}>
                {unread ? <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#F36D21] to-[#F5A313]" aria-hidden="true" /> : null}
                <article className="p-4 pl-5 sm:p-5 sm:pl-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', unread ? 'bg-[#FFF2E8] text-[#943A0A]' : 'bg-[#F4F3F1] text-[#716B62]')}>
                      <BellRing className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="flex min-w-0 items-start gap-2">
                          <h2 className="min-w-0 text-[15px] font-semibold leading-6 text-[#171412]">{unread ? <span className="sr-only">Unread update. </span> : null}{notification.title}</h2>
                          {unread ? <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#E96717]" aria-label="Unread" /> : null}
                        </div>
                        <time dateTime={displayNotificationDate(notification, member.createdAt)} className="text-xs font-normal text-[#716B62] sm:shrink-0 sm:pt-1">{formatNotificationDate(displayNotificationDate(notification, member.createdAt))}</time>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm font-normal leading-6 text-[#625B52]">{notification.message}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                      {notification.ctaUrl && notification.ctaLabel ? (
                        <Link href={notification.ctaUrl} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#FFF2E8] px-3 text-sm font-medium text-[#84330B] transition-colors hover:bg-[#FFE6D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">
                          {notification.ctaLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : null}
                      {notification.campaignId === AFL_2026_CALENDAR.campaignId ? (
                        <a href={AFL_2026_CALENDAR.addUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E9C9AE] px-3 text-sm font-medium text-[#84330B] transition-colors hover:bg-[#FFF7EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">
                          Add to Google Calendar<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null}
                      {unread ? (
                        <button type="button" disabled={isNotificationMarkingDisabled(marking, notification.id)} onClick={() => void markOne(notification.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#625B52] hover:bg-[#F7F6F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 disabled:opacity-50">
                          {marking === notification.id ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                          {marking === notification.id ? 'Marking read...' : 'Mark as read'}
                        </button>
                      ) : <span className="inline-flex min-h-10 items-center gap-1.5 px-3 text-xs font-medium text-[#55705A]"><Check className="h-4 w-4" aria-hidden="true" />Read</span>}
                    </div>
                  </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#DED8CE] bg-white px-5 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF2E8] text-[#943A0A]">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-medium text-[#171412]">You’re all caught up</h2>
          <p className="mt-1 max-w-xs text-sm font-normal leading-6 text-[#625B52]">Member news and award updates will appear here when there’s something new.</p>
        </div>
      )}
    </div>
  )
}
