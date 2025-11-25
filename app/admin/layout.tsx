'use client'

import AdminHeader from './components/AdminHeader'
import AdminFooter from './components/AdminFooter'
import SessionSecurityGuard from '@/app/components/SessionSecurityGuard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Security: Auto-logout after 30 minutes of inactivity */}
      <SessionSecurityGuard
        timeoutMinutes={30}
        warningMinutes={2}
        enabled={true}
      />

      <AdminHeader />
      <main className="w-full px-4 md:px-6 lg:px-8 xl:px-12 flex-grow">
        <div className="container mx-auto max-w-[95%] 2xl:max-w-[1400px]">
          {children}
        </div>
      </main>
      <AdminFooter />
    </div>
  )
}
