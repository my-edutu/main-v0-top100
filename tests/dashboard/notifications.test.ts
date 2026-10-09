import { describe, expect, it } from 'vitest'

import {
  isNotificationMarkingDisabled,
  markNotificationReadInList,
  notificationUnreadCount,
} from '@/app/dashboard/_lib/notifications'
import { createDemoDashboardStore, DEMO_MEMBER_ID } from '@/lib/dev-dashboard/store'
import { mapNotification } from '@/lib/member-hub-server'

describe('routed notification inbox', () => {
  it('keeps the scalar badge in sync after marking one or all updates', () => {
    const initial = createDemoDashboardStore().notifications
    expect(notificationUnreadCount(initial, DEMO_MEMBER_ID)).toBe(2)

    const markedOne = markNotificationReadInList(
      initial,
      DEMO_MEMBER_ID,
      'demo-notification-1',
    )
    expect(notificationUnreadCount(markedOne, DEMO_MEMBER_ID)).toBe(1)

    const allUnread = initial.map((notification) => ({
      ...notification,
      readBy: [],
    }))
    const markedAll = markNotificationReadInList(allUnread, DEMO_MEMBER_ID, 'all')
    expect(notificationUnreadCount(markedAll, DEMO_MEMBER_ID)).toBe(0)
  })

  it('seeds demo calls to action with durable dashboard routes', () => {
    expect(
      createDemoDashboardStore().notifications.map(
        (notification) => notification.ctaUrl,
      ),
    ).toEqual(['/dashboard/me/profile', '/handbooks/2026-participant-handbook.pdf'])
  })

  it('keeps other notification actions available while one update is being marked', () => {
    expect(isNotificationMarkingDisabled('notification-a', 'notification-a')).toBe(true)
    expect(isNotificationMarkingDisabled('notification-a', 'notification-b')).toBe(false)
    expect(isNotificationMarkingDisabled('all', 'notification-b')).toBe(true)
    expect(isNotificationMarkingDisabled(null, 'notification-b')).toBe(false)
  })

  it('preserves the all-member audience and handbook CTA in the member inbox model', () => {
    expect(mapNotification({
      id: 'handbook-notice',
      user_id: 'member-2026',
      title: 'Your 2026 participant handbook is ready',
      body: 'Find your first steps, programme information, and key dates in one guide.',
      category: 'admin',
      cta_label: 'Open handbook',
      cta_url: '/handbooks/2026-participant-handbook.pdf',
      metadata: { audience: 'all' },
      delivered_at: '2026-10-09T10:00:00.000Z',
    })).toMatchObject({
      audience: 'all',
      ctaLabel: 'Open handbook',
      ctaUrl: '/handbooks/2026-participant-handbook.pdf',
    })
  })
})
