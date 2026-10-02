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
  const { member, notifications } = useDashboardMember()
  const [unreadUpdates, setUnreadUpdates] = useState(0)
  const [awardNeedsAttention, setAwardNeedsAttention] = useState(false)

  const refreshBadges = useCallback(async () => {
    try {
      const award = await fetchAwardPayment()
      setAwardNeedsAttention(award.needsPayment)
    } catch {
      // Keep the last known badge state when a transient request fails.
    }
  }, [])

  useEffect(() => {
    setUnreadUpdates(notifications.filter(
      notification => notification.status === 'sent' &&
        (notification.audience === 'all' || member.status === 'approved') &&
        !notification.readBy.includes(member.id),
    ).length)
  }, [member.id, member.status, notifications])

  useEffect(() => {
    void refreshBadges()
    let timeout = 0
    const scheduleRefresh = () => {
      timeout = window.setTimeout(() => {
        if (!document.hidden) void refreshBadges()
        scheduleRefresh()
      }, 240_000 + Math.floor(Math.random() * 120_000))
    }
    scheduleRefresh()
    return () => {
      window.clearTimeout(timeout)
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
