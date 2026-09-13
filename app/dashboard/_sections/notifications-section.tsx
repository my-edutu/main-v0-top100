'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, BellRing, Check, CheckCheck, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  fetchMemberHubState,
  markAllNotificationsRead,
  markNotificationRead,
  type MemberNotification,
} from '@/lib/member-hub'
import { cn } from '@/lib/utils'
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
  const { member } = useDashboardMember()
  const { setUnreadUpdates } = useDashboardBadges()
  const [notifications, setNotifications] = useState<MemberNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [marking, setMarking] = useState<string | 'all' | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const state = await fetchMemberHubState()
      const visible = state.notifications.filter(
        (notification) =>
          notification.status === 'sent' &&
          (notification.audience === 'all' || member.status === 'approved'),
      )
      setNotifications(visible)
      setUnreadUpdates(notificationUnreadCount(visible, member.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your updates.')
    } finally {
      setLoading(false)
    }
  }, [member.id, member.status, setUnreadUpdates])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

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
      setNotifications(
        markNotificationReadInList(notifications, member.id, 'all'),
      )
      setUnreadUpdates(0)
      toast.success('All updates marked as read.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not mark all updates read.')
    } finally {
      setMarking(null)
    }
  }

  if (loading) {
    return (
      <div role="status" aria-label="Loading member updates" className="space-y-3 rounded-[20px] border border-[#E7DDCF] bg-white p-5">
        {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-[16px] bg-[#FBF7EF] motion-reduce:animate-none" />)}
        <span className="sr-only">Loading member updates</span>
      </div>
    )
  }

  if (error) {
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-[#E7DDCF] bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-[#625B52]">
          <span className={cn('h-2 w-2 rounded-full', unreadCount > 0 ? 'bg-orange-500' : 'bg-emerald-500')} aria-hidden="true" />
          {unreadCount > 0 ? `${unreadCount} unread ${unreadCount === 1 ? 'update' : 'updates'}` : 'You’re all caught up'}
        </p>
        {unreadCount > 0 ? (
          <Button type="button" variant="ghost" disabled={marking !== null} onClick={() => void markAll()} className="min-h-11 rounded-xl px-3 font-medium text-orange-900 hover:bg-orange-50 hover:text-orange-950">
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
              <li key={notification.id} className={cn('rounded-[18px] border p-4 transition-colors sm:p-5', unread ? 'border-orange-200 bg-[#FFF9F3]' : 'border-[#E7DDCF] bg-white')}>
                <article className="flex items-start gap-3">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]', unread ? 'bg-orange-100 text-orange-800' : 'bg-[#F1F2F4] text-[#625B52]')}>
                    <BellRing className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        {unread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden="true" /> : null}
                        <div className="min-w-0">
                        {unread ? <span className="sr-only">Unread update. </span> : null}
                          <h2 className="text-base font-semibold leading-6 text-[#171412]">{notification.title}</h2>
                        </div>
                      </div>
                      <time dateTime={displayNotificationDate(notification, member.createdAt)} className="pl-4 text-xs font-normal text-[#746C63] sm:shrink-0 sm:pl-0 sm:pt-1">{formatNotificationDate(displayNotificationDate(notification, member.createdAt))}</time>
                    </div>
                    <p className="mt-2 text-sm font-normal leading-6 text-[#625B52]">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {notification.ctaUrl && notification.ctaLabel ? (
                        <Link href={notification.ctaUrl} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 text-sm font-medium text-orange-900 transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">
                          {notification.ctaLabel}<ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : null}
                      {unread ? (
                        <button type="button" disabled={isNotificationMarkingDisabled(marking, notification.id)} onClick={() => void markOne(notification.id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[#6C2600] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 disabled:opacity-50">
                          {marking === notification.id ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                          {marking === notification.id ? 'Marking read...' : 'Mark as read'}
                        </button>
                      ) : <span className="inline-flex min-h-11 items-center gap-1.5 text-xs font-medium uppercase tracking-[0.1em] text-emerald-700"><Check className="h-4 w-4" aria-hidden="true" />Read</span>}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="flex min-h-[calc(100dvh-380px)] flex-col items-center justify-center px-4 py-8 text-center">
          <BellRing className="mx-auto h-7 w-7 text-[#6C2600]" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-medium text-[#171412]">You are all caught up</h2>
          <p className="mt-2 max-w-xs text-sm font-normal leading-6 text-[#625B52]">Member news and award updates will appear here.</p>
        </div>
      )}
    </div>
  )
}
