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
    <SidebarProvider defaultOpen={defaultOpen} className="top100-admin">
      <SessionSecurityGuard timeoutMinutes={30} warningMinutes={2} enabled />

      <AdminSidebar />

      <SidebarInset className="admin-canvas bg-[#f7f6f2] text-[#181715]">
        {/*
          Mobile header. This is sticky *in flow* rather than fixed, so it
          occupies layout space and page content cannot render underneath it.
          That is what removed the 37 per-page top-padding compensations that
          the old fixed header required.
        */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[#e7e3dc] bg-white/95 px-3 backdrop-blur md:hidden">
          <SidebarTrigger className="size-11 rounded-xl text-zinc-700 hover:bg-orange-50" />
          <span className="h-5 w-px bg-[#e7e3dc]" aria-hidden="true" />
          <h1 className="truncate text-sm font-medium text-zinc-900">
            {resolvePageTitle(pathname)}
          </h1>
          <span className="ml-auto rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            Staff
          </span>
        </header>

        <main className="admin-content mx-auto flex-grow px-4 pb-12 pt-5 sm:px-6 md:px-8 md:pt-8 xl:px-10">
          {children}
        </main>

        <AdminFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}
