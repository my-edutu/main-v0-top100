import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: string
  /** Renders a back link above the title. */
  backHref?: string
  backLabel?: string
  /** Primary/secondary actions for this page. */
  actions?: React.ReactNode
  className?: string
}

/**
 * The single heading treatment for every admin page.
 *
 * Replaces the per-page headings that had drifted apart — some gradient
 * `text-3xl`, others `text-3xl sm:text-4xl font-black`. Actions stack
 * full-width below the title on small screens and sit inline-right from `sm:`,
 * which is what makes the page's primary action reachable on mobile now that
 * the global floating action button is gone.
 */
export default function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel = 'Back',
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg pr-3 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-950"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 border-b border-[#e7e3dc] pb-5 sm:flex-row sm:items-end sm:justify-between md:pb-6">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? <p className="admin-kicker">{eyebrow}</p> : null}
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.035em] text-zinc-950 sm:text-[2rem]">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl text-sm font-normal leading-6 text-zinc-500 sm:text-[15px]">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
