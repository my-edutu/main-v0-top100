'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { isDashboardNavActive, primaryDashboardNav, type DashboardColor } from '../_lib/navigation'
import { useDashboardBadges } from '../_providers/dashboard-badges'

const activeColorClasses: Record<DashboardColor, string> = {
  ember: 'bg-[#FFE7D5] text-[#6C2600]',
  saffron: 'bg-[#FFE49A] text-[#563700]',
  forest: 'bg-[#CFF3DF] text-[#064C36]',
  cobalt: 'bg-[#DCE8FF] text-[#123A78]',
  burgundy: 'bg-[#F8DCE6] text-[#6E1636]',
  charcoal: 'bg-[#E8EBF0] text-[#252B35]',
}

export function DashboardBottomNav() {
  const pathname = usePathname()
  const { unreadMessages } = useDashboardBadges()

  return (
    <nav
      aria-label="Primary dashboard navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E7DDCF] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
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
                'relative flex min-h-[68px] min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-bold text-[#625B52] transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#171412]',
                active && 'text-[#171412]',
              )}
            >
              <span className={cn('relative flex h-8 min-w-10 items-center justify-center rounded-xl px-2', active && activeColorClasses[item.color])}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.65 : 2.1} aria-hidden="true" />
                {badge > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#123A78] px-1 text-[9px] font-extrabold leading-none text-white" aria-label={`${badge} unread messages`}>
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : null}
              </span>
              <span className="truncate">{item.label}</span>
              {active ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-current" aria-hidden="true" /> : null}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
