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

import { fetchAwardPayment } from '@/lib/awards/payment'
import { fetchMemberHubState } from '@/lib/member-hub'
import { useDashboardMember } from './dashboard-member'

type DashboardBadgeContextValue = {
  unreadUpdates: number
  awardNeedsAttention: boolean
  setUnreadUpdates: Dispatch<SetStateAction<number>>
  setAwardNeedsAttention: Dispatch<SetStateAction<boolean>>
  refreshBadges: () => Promise<void>
}

const DashboardBadgeContext = createContext<DashboardBadgeContextValue | null>(null)

export function DashboardBadgeProvider({ children }: { children: ReactNode }) {
  const { member } = useDashboardMember()
  const [unreadUpdates, setUnreadUpdates] = useState(0)
  const [awardNeedsAttention, setAwardNeedsAttention] = useState(false)

  const refreshBadges = useCallback(async () => {
    const [updatesResult, awardResult] = await Promise.allSettled([
      fetchMemberHubState(),
      fetchAwardPayment(),
    ])

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
      setAwardNeedsAttention(awardResult.value.needsPayment)
    }
  }, [member.id, member.status])

  useEffect(() => {
    void refreshBadges()
    const refresh = () => { if (!document.hidden) void refreshBadges() }
    window.addEventListener('focus', refresh)
    const interval = window.setInterval(refresh, 30000)
    return () => {
      window.removeEventListener('focus', refresh)
      window.clearInterval(interval)
    }
  }, [refreshBadges])

  const value = useMemo(
    () => ({
      unreadUpdates,
      awardNeedsAttention,
      setUnreadUpdates,
      setAwardNeedsAttention,
      refreshBadges,
    }),
    [awardNeedsAttention, refreshBadges, unreadUpdates],
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
