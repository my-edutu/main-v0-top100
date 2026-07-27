'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
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
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href="/admin"
          onClick={closeOnNavigate}
          className="flex items-center gap-2 px-2 py-1.5"
        >
          <Image
            src="/Top100 Africa Future leaders Logo .png"
            alt="Top 100 Africa Future Leaders"
            width={32}
            height={32}
            className="size-8 shrink-0 object-contain"
            priority
          />
          <span className="truncate text-sm font-semibold text-zinc-900 group-data-[collapsible=icon]:hidden">
            Admin Console
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group, index) => (
          <SidebarGroup key={group.label ?? `group-${index}`}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
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
                        className="h-11 md:h-8"
                      >
                        <Link
                          href={item.href}
                          onClick={closeOnNavigate}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <Icon />
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

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Log Out"
              className="h-11 text-rose-600 hover:bg-rose-50 hover:text-rose-700 md:h-8"
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
