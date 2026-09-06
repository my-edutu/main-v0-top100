'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { isDashboardNavActive, primaryDashboardNav, type DashboardColor } from '../_lib/navigation'
import { useDashboardBadges } from '../_providers/dashboard-badges'
import { top100DashboardTheme } from '@/lib/dashboard/theme'

const activeColorClasses: Record<DashboardColor, string> = {
  ember: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
  saffron: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
  forest: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
  cobalt: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
  burgundy: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
  charcoal: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
}

export function DashboardBottomNav() {
  const pathname = usePathname()
  const { unreadMessages } = useDashboardBadges()
  if (pathname === '/dashboard/me/award' || pathname.startsWith('/dashboard/me/award/') || pathname === '/dashboard/me/profile') return null

  return (
    <nav
      aria-label="Primary dashboard navigation"
      className={`hub-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden ${top100DashboardTheme.nav}`}
    >
      <div className="grid min-h-[68px] grid-cols-4">
        {primaryDashboardNav.map((item) => {
          const Icon = item.icon
          const active = isDashboardNavActive(pathname, item.href)
          const badge = item.id === 'messages' ? unreadMessages : 0

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium text-[#625B52] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#171412]',
                active && 'text-[#171412]',
              )}
            >
              <span className={cn('relative flex h-8 min-w-10 items-center justify-center rounded-xl px-2', active && activeColorClasses[item.color])}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.65 : 2.1} aria-hidden="true" />
                {badge > 0 ? (
                  <span className="hub-count absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#171717] px-1 text-[9px] font-semibold leading-none text-white" aria-label={`${badge} unread messages`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
