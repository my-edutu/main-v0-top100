'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

import { fetchAwardOrder } from '@/lib/awards'
import { fetchConversations, fetchMemberHubState } from '@/lib/member-hub'
import { useDashboardMember } from './dashboard-member'

type DashboardBadgeContextValue = {
  unreadMessages: number
  unreadUpdates: number
  awardNeedsAttention: boolean
  setUnreadMessages: Dispatch<SetStateAction<number>>
  setUnreadUpdates: Dispatch<SetStateAction<number>>
  setAwardNeedsAttention: Dispatch<SetStateAction<boolean>>
  refreshBadges: () => Promise<void>
}

const DashboardBadgeContext = createContext<DashboardBadgeContextValue | null>(null)

export function DashboardBadgeProvider({ children }: { children: ReactNode }) {
  const { member } = useDashboardMember()
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadUpdates, setUnreadUpdates] = useState(0)
  const [awardNeedsAttention, setAwardNeedsAttention] = useState(false)

  const refreshBadges = useCallback(async () => {
    const [messagesResult, updatesResult, awardResult] = await Promise.allSettled([
      fetchConversations(),
      fetchMemberHubState(),
      fetchAwardOrder(),
    ])

    if (messagesResult.status === 'fulfilled') {
      setUnreadMessages(messagesResult.value.unreadTotal)
    }

    if (updatesResult.status === 'fulfilled') {
      const unreadCount = updatesResult.value.notifications.filter(
        (notification) =>
          notification.status === 'sent' &&
          (notification.audience === 'all' || member.status === 'approved') &&
          !notification.readBy.includes(member.id),
      ).length
      setUnreadUpdates(unreadCount)
    }

    if (awardResult.status === 'fulfilled') {
      setAwardNeedsAttention(awardResult.value.needsClaim)
    }
  }, [member.id, member.status])

  useEffect(() => {
    void refreshBadges()
  }, [refreshBadges])

  const value = useMemo(
    () => ({
      unreadMessages,
      unreadUpdates,
      awardNeedsAttention,
      setUnreadMessages,
      setUnreadUpdates,
      setAwardNeedsAttention,
      refreshBadges,
    }),
    [awardNeedsAttention, refreshBadges, unreadMessages, unreadUpdates],
  )

  return (
    <DashboardBadgeContext.Provider value={value}>
      {children}
    </DashboardBadgeContext.Provider>
  )
}

export function useDashboardBadges() {
  const context = useContext(DashboardBadgeContext)

  if (!context) {
    throw new Error('useDashboardBadges must be used within DashboardBadgeProvider')
  }

  return context
}
