'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { isDashboardNavActive, primaryDashboardNav, type DashboardColor } from '../_lib/navigation'
import { useDashboardBadges } from '../_providers/dashboard-badges'
import { top100DashboardTheme } from '@/lib/dashboard/theme'

const activeColorClasses: Record<DashboardColor, string> = {
  ember: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-stone-950 shadow-sm',
  saffron: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-stone-950 shadow-sm',
  forest: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-stone-950 shadow-sm',
  cobalt: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-stone-950 shadow-sm',
  burgundy: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-stone-950 shadow-sm',
  charcoal: 'bg-gradient-to-r from-yellow-300 to-amber-400 text-stone-950 shadow-sm',
}

export function DashboardDesktopNav() {
  const pathname = usePathname()
  const { unreadMessages } = useDashboardBadges()

  return (
    <aside className={`hub-desktop-nav hidden w-[88px] shrink-0 border-r lg:sticky lg:top-[60px] lg:flex lg:h-[calc(100dvh-60px)] lg:flex-col xl:w-[240px] ${top100DashboardTheme.nav}`}>
      <nav aria-label="Primary dashboard navigation" className="flex flex-1 flex-col gap-2 p-3 xl:p-4">
        {primaryDashboardNav.map((item) => {
          const Icon = item.icon
          const active = isDashboardNavActive(pathname, item.href)
          const badge = item.id === 'messages' ? unreadMessages : 0

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              aria-label={badge > 0 ? `${item.label} (${badge} unread)` : item.label}
              className={cn(
                'group relative flex min-h-14 items-center justify-center rounded-[16px] text-[#625B52] transition duration-200 hover:bg-[#FBF7EF] hover:text-[#171412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171412] focus-visible:ring-offset-2 xl:justify-start xl:gap-3 xl:px-3',
                active && activeColorClasses[item.color],
              )}
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-current/10 bg-white/45">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2.15} aria-hidden="true" />
                {badge > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#123A78] px-1 text-[9px] font-extrabold leading-none text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span className="hidden truncate text-sm font-extrabold xl:block">{item.label}</span>
              {active ? <span className="absolute left-0 h-7 w-1 rounded-r-full bg-current" aria-hidden="true" /> : null}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
