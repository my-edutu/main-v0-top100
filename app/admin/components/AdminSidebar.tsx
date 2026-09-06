'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { navGroups, isNavItemActive } from './nav-config'

export default function AdminSidebar() {
  const pathname = usePathname()
  const { setOpenMobile, isMobile } = useSidebar()

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Logout failed')
      return
    }
    window.location.href = '/admin/login'
  }

  // Closing the drawer on navigation is only meaningful on mobile; on desktop
  // the sidebar is persistent and there is nothing to dismiss.
  const closeOnNavigate = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <Sidebar collapsible="icon" className="border-[#e7e3dc]">
      <SidebarHeader className="border-b border-[#e7e3dc] px-3 py-3">
        <Link
          href="/admin"
          onClick={closeOnNavigate}
          className="flex min-h-11 items-center gap-2.5 rounded-xl px-2 transition-colors hover:bg-orange-50"
        >
          <Image
            src="/Top100 Africa Future leaders Logo .png"
            alt="Top 100 Africa Future Leaders"
            width={32}
            height={32}
            className="size-9 shrink-0 object-contain"
            priority
          />
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-semibold text-zinc-950">Top100 Admin</span>
            <span className="block truncate text-[10px] font-medium uppercase tracking-[0.13em] text-zinc-500">Staff workspace</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1 py-2">
        {navGroups.map((group, index) => (
          <SidebarGroup key={group.label ?? `group-${index}`}>
            {group.label && <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = isNavItemActive(pathname, item.href)
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        // 44px minimum touch target on mobile, compact on desktop.
                        className={cn(
                          'h-11 rounded-xl px-3 text-sm font-medium text-zinc-600 transition-colors md:h-10',
                          isActive && 'bg-gradient-to-r from-orange-500 to-amber-500 font-semibold text-white hover:from-orange-500 hover:to-amber-500 hover:text-white',
                        )}
                      >
                        <Link
                          href={item.href}
                          onClick={closeOnNavigate}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon className="size-[18px]" strokeWidth={isActive ? 2.3 : 1.9} />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-[#e7e3dc] p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Log Out"
              className="h-11 rounded-xl px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 hover:text-rose-800"
            >
              <LogOut />
              <span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
