'use client'

import { usePathname } from 'next/navigation'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import SessionSecurityGuard from '@/app/components/SessionSecurityGuard'
import AdminSidebar from './AdminSidebar'
import AdminFooter from './AdminFooter'
import { resolvePageTitle } from './nav-config'

export default function AdminShell({
  defaultOpen,
  children,
}: {
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()

  // The sign-in screen is public and renders without the console chrome
  // (no sidebar, no session guard — there is no session yet).
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <SessionSecurityGuard timeoutMinutes={30} warningMinutes={2} enabled />

      <AdminSidebar />

      <SidebarInset className="bg-zinc-50 text-zinc-900">
        {/*
          Mobile header. This is sticky *in flow* rather than fixed, so it
          occupies layout space and page content cannot render underneath it.
          That is what removed the 37 per-page top-padding compensations that
          the old fixed header required.
        */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-orange-100 bg-white/95 px-4 backdrop-blur md:hidden">
          <SidebarTrigger className="size-11 text-zinc-600" />
          <h1 className="truncate text-base font-semibold text-zinc-900">
            {resolvePageTitle(pathname)}
          </h1>
        </header>

        <div className="mx-auto w-full max-w-[1600px] flex-grow px-4 pb-12 pt-4 md:px-8">
          {children}
        </div>

        <AdminFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
