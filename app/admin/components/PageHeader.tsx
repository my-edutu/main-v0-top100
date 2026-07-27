import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  description?: string
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
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-orange-600"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-zinc-500">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
