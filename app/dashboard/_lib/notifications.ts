import type { MemberNotification } from '@/lib/member-hub'

export function notificationUnreadCount(
  notifications: readonly MemberNotification[],
  memberId: string,
): number {
  return notifications.filter(
    (notification) => !notification.readBy.includes(memberId),
  ).length
}

export function markNotificationReadInList(
  notifications: readonly MemberNotification[],
  memberId: string,
  notificationId: string | 'all',
): MemberNotification[] {
  return notifications.map((notification) => {
    const shouldMark =
      notificationId === 'all' || notification.id === notificationId

    if (!shouldMark || notification.readBy.includes(memberId)) {
      return notification
    }

    return {
      ...notification,
      readBy: [...notification.readBy, memberId],
    }
  })
}
