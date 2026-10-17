'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import '../dashboard.css'

import { DashboardAppBar } from './dashboard-app-bar'
import { DashboardBottomNav } from './dashboard-bottom-nav'
import { DashboardDesktopNav } from './dashboard-desktop-nav'
import { MembershipStatusBanner } from './membership-status-banner'
import { useDashboardMember } from '../_providers/dashboard-member'
import { top100DashboardTheme } from '@/lib/dashboard/theme'

export function DashboardShell({ children }: { children: ReactNode }) {
  const { member } = useDashboardMember()
  const pathname = usePathname()
  const awardDark =
    pathname === '/dashboard/me/award' ||
    pathname.startsWith('/dashboard/me/award/payment') ||
    pathname.startsWith('/dashboard/me/award/complete')
  const newPost = pathname === '/dashboard/me/posts/new'
  const fullWidthSession = pathname.startsWith('/dashboard/discover/event-videos/')
  const fullScreenAwardConfirmation = pathname === '/dashboard/me/award/complete'
  const fullScreenWhatsAppGroup =
    pathname === '/dashboard/discover/groups' && member.status === 'approved'

  return (
    <div className={`awardee-dashboard ${awardDark ? 'hub-award-dark' : ''} ${fullScreenWhatsAppGroup ? 'hub-whatsapp-dark' : ''} min-h-[100dvh] overflow-x-clip font-sans text-[#171412] ${top100DashboardTheme.canvas}`}>
      {!fullScreenAwardConfirmation && <DashboardAppBar />}
      <div className={newPost ? 'min-h-[calc(100dvh-60px)]' : 'flex min-h-[calc(100dvh-60px)] items-start'}>
        {!newPost && !fullScreenAwardConfirmation && <DashboardDesktopNav />}
        <main className={newPost || fullScreenAwardConfirmation || fullScreenWhatsAppGroup ? 'min-w-0 flex-1 p-0' : fullWidthSession ? 'min-w-0 flex-1 bg-white pb-[calc(92px+env(safe-area-inset-bottom))] lg:pb-8' : 'min-w-0 flex-1 px-4 py-5 pb-[calc(92px+env(safe-area-inset-bottom))] sm:px-6 lg:px-6 lg:py-6 lg:pb-8 xl:px-8'}>
          <div className={newPost || fullScreenAwardConfirmation ? 'min-h-[100dvh]' : fullScreenWhatsAppGroup || fullWidthSession ? 'min-h-[calc(100dvh-60px)]' : 'mx-auto max-w-[1280px] space-y-5'}>
            {!newPost && !fullScreenAwardConfirmation && (pathname === '/dashboard' || member.status !== 'pending') && <MembershipStatusBanner member={member} />}
            {children}
          </div>
        </main>
      </div>
      {!newPost && !fullScreenAwardConfirmation && <DashboardBottomNav />}
    </div>
  )
}
