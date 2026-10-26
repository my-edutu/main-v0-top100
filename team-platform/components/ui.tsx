import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="label mb-2">{eyebrow}</p> : null}
        <h1 className="display text-3xl leading-[1.05] md:text-[2.6rem]">{title}</h1>
        {description ? <div className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ember' | 'ghost' | 'soft' | 'danger'
  size?: 'sm' | 'md'
}) {
  return (
    <button
      type={type}
      className={cn(
        'btn',
        `btn-${variant}`,
        size === 'sm' && 'min-h-8 px-3 py-1.5 text-xs',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function LinkButton({
  href,
  children,
  className,
  variant = 'ghost',
  size = 'md',
  target,
}: {
  href: string
  children: ReactNode
  className?: string
  variant?: 'primary' | 'ember' | 'ghost' | 'soft' | 'danger'
  size?: 'sm' | 'md'
  target?: string
}) {
  return (
    <Link
      href={href}
      target={target}
      className={cn('btn', `btn-${variant}`, size === 'sm' && 'min-h-8 px-3 py-1.5 text-xs', className)}
    >
      {children}
    </Link>
  )
}

const chipStyles: Record<string, string> = {
  paid: 'bg-moss-soft text-moss',
  unpaid: 'bg-ink/[0.06] text-muted',
  pending: 'bg-amber-100 text-amber-800',
  refunded: 'bg-red-50 text-red-700',
  contacted: 'bg-sky-50 text-sky-800',
  responded: 'bg-moss-soft text-moss',
  not_contacted: 'bg-ink/[0.05] text-muted',
  due: 'bg-ember-soft text-ember-dark',
  overdue: 'bg-red-50 text-red-700',
  scheduled: 'bg-indigo-50 text-indigo-700',
  none: 'bg-ink/[0.05] text-muted',
  completed: 'bg-moss-soft text-moss',
  requested: 'bg-amber-100 text-amber-800',
  under_review: 'bg-sky-50 text-sky-800',
  approved: 'bg-indigo-50 text-indigo-700',
  processing: 'bg-violet-50 text-violet-700',
  rejected: 'bg-red-50 text-red-700',
  cancelled: 'bg-ink/[0.05] text-muted',
  active: 'bg-moss-soft text-moss',
  suspended: 'bg-red-50 text-red-700',
  invited: 'bg-amber-100 text-amber-800',
  super_admin: 'bg-ink text-cream',
  team_leader: 'bg-indigo-50 text-indigo-700',
  agent: 'bg-sand/60 text-ink',
  earning: 'bg-moss-soft text-moss',
  reversal: 'bg-red-50 text-red-700',
  adjustment: 'bg-amber-100 text-amber-800',
  missing_commission: 'bg-red-50 text-red-700',
  reconciled: 'bg-moss-soft text-moss',
  missing_reversal: 'bg-amber-100 text-amber-800',
  informational: 'bg-ink/[0.05] text-muted',
  sent: 'bg-moss-soft text-moss',
  failed: 'bg-red-50 text-red-700',
  queued: 'bg-amber-100 text-amber-800',
}

export function StatusChip({
  status,
  label,
  className,
  dot = false,
}: {
  status: string
  label?: string
  className?: string
  dot?: boolean
}) {
  const text = label ?? status.replace(/_/g, ' ')
  return (
    <span className={cn('chip capitalize', chipStyles[status] ?? 'bg-ink/[0.06] text-muted', className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {text}
    </span>
  )
}

export function Stat({
  label,
  value,
  hint,
  accent,
  className,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: 'ember' | 'moss' | 'none'
  className?: string
}) {
  return (
    <div className={cn('card-flat p-4 md:p-5', className)}>
      <p className="label">{label}</p>
      <p
        className={cn(
          'num mt-2 text-2xl font-semibold tracking-[-0.03em] md:text-[1.75rem]',
          accent === 'ember' && 'text-ember',
          accent === 'moss' && 'text-moss',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] leading-4 text-muted">{hint}</p> : null}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  illustration,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  illustration?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {illustration ? <img src={illustration} alt="" aria-hidden="true" className="mb-4 h-20 w-24 object-contain" /> : icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink/[0.05] text-muted">{icon}</div> : null}
      <h3 className="display text-xl">{title}</h3>
      {description ? <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold tracking-wide text-cream',
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}

export function Banner({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'error' | 'success' | 'warning'
  children: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-moss/20 bg-moss-soft text-moss',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  }
  return <div className={cn('rounded-xl border px-4 py-3 text-sm leading-6', tones[tone], className)}>{children}</div>
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-semibold text-ink/80">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-4 text-muted">{hint}</span> : null}
    </label>
  )
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-ink/[0.07]', className)}>
      <div
        className="h-full rounded-full bg-ember transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Money({ minor, currency = 'NGN', className }: { minor: number; currency?: string; className?: string }) {
  return <span className={cn('num', className)}>{formatMoney(minor, currency)}</span>
}

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(minor / 100)
}

export function Pagination({
  page,
  pages,
  buildHref,
}: {
  page: number
  pages: number
  buildHref: (page: number) => string
}) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink/[0.07] px-4 py-3 text-xs text-muted">
      <span>
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link className="btn btn-ghost min-h-8 px-3 py-1 text-xs" href={buildHref(page - 1)}>
            Previous
          </Link>
        ) : null}
        {page < pages ? (
          <Link className="btn btn-ghost min-h-8 px-3 py-1 text-xs" href={buildHref(page + 1)}>
            Next
          </Link>
        ) : null}
      </div>
    </div>
  )
}
