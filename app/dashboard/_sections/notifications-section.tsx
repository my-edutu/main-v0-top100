'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCheck, Loader2, RefreshCw } from 'lucide-react'
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
        <Button type="button" onClick={() => void loadNotifications()} className="mt-4 min-h-11 rounded-xl bg-[#171412] text-white hover:bg-[#312B27]">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Retry
        </Button>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#625B52]">{unreadCount} unread {unreadCount === 1 ? 'update' : 'updates'}</p>
        {unreadCount > 0 ? (
          <Button type="button" variant="outline" disabled={marking !== null} onClick={() => void markAll()} className="min-h-11 rounded-xl border-[#D4C7B6] bg-white text-[#171412]">
            {marking === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <CheckCheck className="mr-2 h-4 w-4" aria-hidden="true" />}
            Mark all read
          </Button>
        ) : null}
      </div>

      {notifications.length > 0 ? (
        <ul className="space-y-3">
          {notifications.map((notification) => {
            const unread = !notification.readBy.includes(member.id)
            return (
              <li key={notification.id} className={cn('rounded-[20px] border bg-white p-4 sm:p-5', unread ? 'border-amber-300' : 'border-[#E7DDCF]')}>
                <article className="flex items-start gap-3">
                  <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]', unread ? 'bg-[#FFE49A] text-[#563700]' : 'bg-[#E8EBF0] text-[#252B35]')}>
                    <BellRing className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        {unread ? <span className="sr-only">Unread update. </span> : null}
                        <h2 className="text-base font-extrabold text-[#171412]">{notification.title}</h2>
                      </div>
                      <time dateTime={notification.createdAt} className="text-xs font-bold text-[#625B52]">{formatNotificationDate(notification.createdAt)}</time>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#625B52]">{notification.message}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {notification.ctaUrl && notification.ctaLabel ? (
                        <Link href={notification.ctaUrl} className="flex min-h-11 items-center rounded-xl bg-[#171412] px-4 text-sm font-extrabold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">{notification.ctaLabel}</Link>
                      ) : null}
                      {unread ? (
                        <button type="button" disabled={marking !== null} onClick={() => void markOne(notification.id)} className="min-h-11 rounded-xl px-2 text-sm font-extrabold text-[#6C2600] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 disabled:opacity-50">
                          {marking === notification.id ? 'Marking read...' : 'Mark as read'}
                        </button>
                      ) : <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-emerald-700">Read</span>}
                    </div>
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="rounded-[20px] border border-[#E7DDCF] bg-white p-6 text-center">
          <BellRing className="mx-auto h-7 w-7 text-[#6C2600]" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-extrabold text-[#171412]">You are all caught up</h2>
          <p className="mt-1 text-sm font-semibold text-[#625B52]">Member news and award updates will appear here.</p>
        </div>
      )}
    </div>
  )
}
