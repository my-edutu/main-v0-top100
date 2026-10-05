'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { LoaderCircle, RotateCcw } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { finishDashboardOnboarding } from '@/lib/dashboard/onboarding'
import { fetchMemberHubState, type MemberNotification, type MemberProfile } from '@/lib/member-hub'
import dynamic from 'next/dynamic'
import { DashboardLoading } from '../_components/dashboard-loading'
const Onboarding = dynamic(() => import('../_components/onboarding').then(module => module.Onboarding), { loading: () => <DashboardLoading label="Opening your welcome" /> })
const Top100MomentGate = dynamic(() => import('../_components/top100-moment').then(module => module.Top100MomentGate), { loading: () => <DashboardLoading label="Loading your dashboard" /> })

type DashboardMemberContextValue = {
  member: MemberProfile
  notifications: MemberNotification[]
  loadedAt: number
  replaceNotifications: (notifications: MemberNotification[]) => void
  replaceMember: (member: MemberProfile) => void
  refreshMember: () => Promise<void>
}

const DashboardMemberContext = createContext<DashboardMemberContextValue | null>(null)

export function DashboardMemberProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [member, setMember] = useState<MemberProfile | null>(null)
  const [notifications, setNotifications] = useState<MemberNotification[]>([])
  const [loadedAt, setLoadedAt] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [replayingWelcome, setReplayingWelcome] = useState(false)
  const [welcomeReplayError, setWelcomeReplayError] = useState('')
  const replaceMember = useCallback((nextMember: MemberProfile) => {
    setMember(nextMember)
    setError('')
  }, [])
  const completeOnboarding = useCallback((nextMember: MemberProfile) => {
    finishDashboardOnboarding(nextMember, replaceMember, destination => {
      window.location.replace(destination)
    })
  }, [replaceMember])

  const refreshMember = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const state = await fetchMemberHubState()
      setNotifications(state.notifications)
      const currentMember = state.members.find(
        (candidate) => candidate.id === state.currentMemberId,
      )

      if (!currentMember) {
        throw new Error('We could not find your member profile.')
      }

      setMember(currentMember)
      setLoadedAt(Date.now())
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'We could not load your member profile.',
      )
      throw cause
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshMember().catch(() => undefined)
  }, [refreshMember])

  useEffect(() => {
    if (!member?.onboardingCompletedAt) return
    let cancelled = false
    void fetch('/api/member/visits', { method: 'POST' }).then(async response => {
      if (!response.ok) return
      const data = await response.json()
      if (!cancelled) setMember(current => current ? { ...current, dashboardLoginCount: data.count } : current)
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [member?.id, member?.onboardingCompletedAt])

  if (loading && !member) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-white" role="status" aria-label="Loading your member dashboard">
        <LoaderCircle className="h-8 w-8 animate-spin text-orange-600 motion-reduce:animate-none" aria-hidden="true" />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.18),transparent_32%),linear-gradient(180deg,#FFFAF5_0%,#FFFFFF_54%,#FFF5EB_100%)] px-4 text-[#171412]">
        <section className="w-full max-w-md rounded-[20px] border border-[#E7DDCF] bg-white p-6 text-center sm:p-8" role="alert">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FFE7D5] text-[#6C2600]">
            <RotateCcw className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Your dashboard did not load</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#625B52]">
            {error || 'Please try loading your member profile again.'}
          </p>
          <Button
            type="button"
            onClick={() => void refreshMember().catch(() => undefined)}
            className="mt-5 bg-[#171412] text-white hover:bg-[#312B27]"
          >
            Retry
          </Button>
        </section>
      </div>
    )
  }

  const isLocalPreview = process.env.NODE_ENV !== 'production' && member.id === 'demo-member-1'
  const awardDark =
    pathname === '/dashboard/me/award' ||
    pathname.startsWith('/dashboard/me/award/payment')
  const showTop100Moment = pathname === '/dashboard' && member.status === 'approved'

  async function replayWelcome() {
    if (replayingWelcome) return
    setReplayingWelcome(true)
    setWelcomeReplayError('')
    try {
      const response = await fetch('/api/member/onboarding-journey', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewReset: true }),
      })
      if (!response.ok) throw new Error('Could not reopen the welcome flow.')
      window.location.reload()
    } catch {
      setWelcomeReplayError('Could not reopen the welcome flow. Try again.')
      setReplayingWelcome(false)
    }
  }

  return (
    <DashboardMemberContext.Provider value={{ member, notifications, loadedAt, replaceNotifications: setNotifications, refreshMember, replaceMember }}>
      {isLocalPreview && <div className={`award-preview-banner px-4 py-2 text-center text-xs text-orange-900 ${awardDark ? 'award-preview-dark' : 'bg-orange-50'}`}>Local preview · sample account and activity {member.onboardingCompletedAt && <button type="button" className="ml-2 underline disabled:opacity-60" onClick={() => void replayWelcome()} disabled={replayingWelcome}>{replayingWelcome ? 'Reopening welcome…' : 'Replay welcome'}</button>}{welcomeReplayError && <span role="alert" className="ml-2">{welcomeReplayError}</span>}</div>}
      {!member.onboardingCompletedAt
        ? <Onboarding member={member} onComplete={completeOnboarding} />
        : showTop100Moment
          ? <Top100MomentGate member={member}>{children}</Top100MomentGate>
          : children}
    </DashboardMemberContext.Provider>
  )
}

export function useDashboardMember() {
  const context = useContext(DashboardMemberContext)

  if (!context) {
    throw new Error('useDashboardMember must be used within DashboardMemberProvider')
  }

  return context
}
