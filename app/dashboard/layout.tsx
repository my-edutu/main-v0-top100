import type { ReactNode } from 'react'

export const metadata = {
  title: 'Member Dashboard | Top100 Africa Future Leaders',
  description: 'Manage your profile, announcements, achievements and public awardee presence.',
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      <div className="relative z-10">
        {children}
      </div>
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,88,0,0.15),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(255,165,0,0.08),transparent_55%)]" />
      </div>
    </div>
  )
}
