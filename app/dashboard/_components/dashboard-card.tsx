import Link from 'next/link'
import { ArrowUpRight, type LucideIcon } from 'lucide-react'

import type { DashboardColor } from '../_lib/navigation'
import { cn } from '@/lib/utils'

export const dashboardColorClasses = {
  ember: 'border-amber-100 bg-white text-stone-900 shadow-[0_14px_40px_rgba(113,82,0,.08)]',
  saffron: 'border-amber-100 bg-white text-stone-900 shadow-[0_14px_40px_rgba(113,82,0,.08)]',
  forest: 'border-amber-100 bg-white text-stone-900 shadow-[0_14px_40px_rgba(113,82,0,.08)]',
  cobalt: 'border-amber-100 bg-white text-stone-900 shadow-[0_14px_40px_rgba(113,82,0,.08)]',
  burgundy: 'border-amber-100 bg-white text-stone-900 shadow-[0_14px_40px_rgba(113,82,0,.08)]',
  charcoal: 'border-amber-100 bg-white text-stone-900 shadow-[0_14px_40px_rgba(113,82,0,.08)]',
} as const

type DashboardCardProps = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  color: DashboardColor
  badge?: number | string
  compact?: boolean
}

export function DashboardCard({
  href,
  title,
  description,
  icon: Icon,
  color,
  badge,
  compact = false,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'hub-card group relative flex rounded-[16px] border p-4 font-sans shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#171412] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF7EF] motion-reduce:transform-none motion-reduce:transition-none sm:p-5',
        compact ? 'min-h-[92px] items-center gap-3' : 'min-h-[156px] flex-col',
        dashboardColorClasses[color],
      )}
    >
      <span className="hub-card-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-current/15 bg-white/45">
        <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </span>

      <span className={cn('min-w-0', compact ? 'flex-1' : 'mt-auto pt-5')}>
        <span className="hub-card-title block text-lg font-extrabold leading-tight tracking-tight">{title}</span>
        <span className="hub-card-description mt-1 block text-sm font-semibold leading-5 opacity-80">{description}</span>
      </span>

      {badge !== undefined && badge !== 0 && badge !== '' ? (
        <span className="absolute right-3 top-3 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[#171412] px-1.5 text-xs font-extrabold text-white" aria-label={`${badge} items`}>
          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
        </span>
      ) : (
        <ArrowUpRight
          className={cn(
            'h-5 w-5 shrink-0 opacity-65 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none',
            compact ? '' : 'absolute right-4 top-4',
          )}
          aria-hidden="true"
        />
      )}
    </Link>
  )
}
