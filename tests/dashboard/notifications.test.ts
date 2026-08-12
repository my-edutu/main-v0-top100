import { describe, expect, it } from 'vitest'

import {
  markNotificationReadInList,
  notificationUnreadCount,
} from '@/app/dashboard/_lib/notifications'
import { createDemoDashboardStore, DEMO_MEMBER_ID } from '@/lib/dev-dashboard/store'

describe('routed notification inbox', () => {
  it('keeps the scalar badge in sync after marking one or all updates', () => {
    const initial = createDemoDashboardStore().notifications
    expect(notificationUnreadCount(initial, DEMO_MEMBER_ID)).toBe(1)

    const markedOne = markNotificationReadInList(
      initial,
      DEMO_MEMBER_ID,
      'demo-notification-1',
    )
    expect(notificationUnreadCount(markedOne, DEMO_MEMBER_ID)).toBe(0)

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
    ).toEqual([
      '/dashboard/me/profile',
      '/dashboard/discover/opportunities',
    ])
  })
})
