'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeftRight,
  BadgeCent,
  Banknote,
  Bell,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Mail,
  Menu,
  PhoneCall,
  ScrollText,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Role } from '@/lib/types'

const icons = {
  overview: LayoutDashboard,
  awardees: Users,
  followups: PhoneCall,
  earnings: BadgeCent,
  withdrawals: Wallet,
  notifications: Bell,
  profile: User,
  assignments: ArrowLeftRight,
  team: Building2,
  payments: Banknote,
  commissions: Gauge,
  imports: FileSpreadsheet,
  reports: FileText,
  templates: Mail,
  settings: Settings,
  audit: ScrollText,
  queue: ListChecks,
  approvals: ShieldCheck,
  activity: ClipboardList,
} as const

export type NavItem = {
  href: string
  label: string
  icon: keyof typeof icons
  badge?: number
}

export function SidebarNav({
  items,
  label,
  collapsedLabel,
}: {
  items: NavItem[]
  label: string
  collapsedLabel?: string
}) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className="space-y-0.5">
      {collapsedLabel ? <p className="label mb-2 px-3 text-cream/35">{collapsedLabel}</p> : null}
      {items.map((item) => {
        const Icon = icons[item.icon]
        const active =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn('nav-link', active && 'nav-link-active')}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-ember' : 'opacity-70')} strokeWidth={1.8} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-ember px-1.5 py-0.5 text-[10px] font-bold text-white">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  const mobileItems = items.filter((item) => item.icon !== 'followups')
  const primary = mobileItems.filter((item) => item.icon !== 'notifications' && item.icon !== 'profile' && item.icon !== 'earnings' && item.icon !== 'withdrawals')
  const secondaryActive = pathname === '/menu' || pathname === '/settings' ||
    mobileItems.some((item) => ['notifications', 'profile', 'earnings', 'withdrawals'].includes(item.icon) && pathname.startsWith(item.href))

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }}
      >
        {primary.map((item) => {
          const Icon = icons[item.icon]
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium',
                active ? 'text-ember' : 'text-muted',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.7} />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
        <Link
          href="/menu"
          className={cn(
            'flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium',
            secondaryActive ? 'text-ember' : 'text-muted',
          )}
          aria-current={pathname === '/menu' ? 'page' : undefined}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </Link>
      </div>
    </nav>
  )
}
