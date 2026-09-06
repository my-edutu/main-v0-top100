import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type RouteSectionProps = {
  title: string
  description?: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function RouteSection({
  title,
  description,
  eyebrow,
  action,
  children,
  className,
}: RouteSectionProps) {
  return (
    <section className={cn('animate-in space-y-5 fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none', className)}>
      <header className="hub-route-heading flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.16em] text-orange-700">{eyebrow}</p>
          ) : null}
          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.025em] text-[#171412] sm:text-[32px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#625B52] sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      {children}
    </section>
  )
}
