import type { ReactNode } from 'react'

import { DashboardShell } from './_components/dashboard-shell'
import { DashboardBadgeProvider } from './_providers/dashboard-badges'
import { DashboardMemberProvider } from './_providers/dashboard-member'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardMemberProvider>
      <DashboardBadgeProvider>
        <DashboardShell>{children}</DashboardShell>
      </DashboardBadgeProvider>
    </DashboardMemberProvider>
  )
}
