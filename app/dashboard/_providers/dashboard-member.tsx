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

import { Button } from '@/components/ui/button'
import { fetchMemberHubState, type MemberProfile } from '@/lib/member-hub'

type DashboardMemberContextValue = {
  member: MemberProfile
  replaceMember: (member: MemberProfile) => void
  refreshMember: () => Promise<void>
}

const DashboardMemberContext = createContext<DashboardMemberContextValue | null>(null)

export function DashboardMemberProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<MemberProfile | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const replaceMember = useCallback((nextMember: MemberProfile) => {
    setMember(nextMember)
    setError('')
  }, [])

  const refreshMember = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const state = await fetchMemberHubState()
      const currentMember = state.members.find(
        (candidate) => candidate.id === state.currentMemberId,
      )

      if (!currentMember) {
        throw new Error('We could not find your member profile.')
      }

      setMember(currentMember)
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

  if (loading && !member) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,.28),transparent_32%),linear-gradient(180deg,#FFFDF5_0%,#FFFFFF_54%,#FFF8D6_100%)] px-4 text-[#171412]">
        <div
          role="status"
          aria-label="Loading your member dashboard"
          className="flex flex-col items-center gap-3 text-sm font-bold text-[#625B52]"
        >
          <LoaderCircle className="h-8 w-8 animate-spin text-orange-600 motion-reduce:animate-none" aria-hidden="true" />
          <span>Loading your member dashboard...</span>
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,.28),transparent_32%),linear-gradient(180deg,#FFFDF5_0%,#FFFFFF_54%,#FFF8D6_100%)] px-4 text-[#171412]">
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

  return (
    <DashboardMemberContext.Provider value={{ member, refreshMember, replaceMember }}>
      {children}
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
