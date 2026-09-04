'use client'

import type { ReactNode } from 'react'

import { DashboardAppBar } from './dashboard-app-bar'
import { DashboardBottomNav } from './dashboard-bottom-nav'
import { DashboardDesktopNav } from './dashboard-desktop-nav'
import { MembershipStatusBanner } from './membership-status-banner'
import { useDashboardMember } from '../_providers/dashboard-member'
import { top100DashboardTheme } from '@/lib/dashboard/theme'

export function DashboardShell({ children }: { children: ReactNode }) {
  const { member } = useDashboardMember()

  return (
    <div className={`min-h-[100dvh] overflow-x-clip font-sans text-[#171412] ${top100DashboardTheme.canvas}`}>
      <DashboardAppBar />
      <div className="flex min-h-[calc(100dvh-60px)] items-start">
        <DashboardDesktopNav />
        <main className="min-w-0 flex-1 px-4 py-5 pb-[calc(92px+env(safe-area-inset-bottom))] sm:px-6 lg:px-6 lg:py-6 lg:pb-8 xl:px-8">
          <div className="mx-auto max-w-[1280px] space-y-5">
            <MembershipStatusBanner member={member} />
            {children}
          </div>
        </main>
      </div>
      <DashboardBottomNav />
    </div>
  )
}
