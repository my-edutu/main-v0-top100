import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

export const festivalControl = 'inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-sm font-medium text-stone-800 hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 disabled:opacity-45'

const statusTone = {
  neutral: 'bg-stone-100 text-stone-700',
  good: 'bg-emerald-50 text-emerald-800',
  pending: 'bg-amber-50 text-amber-900',
}

export function FestivalStatus({ tone = 'neutral', children }: { tone?: keyof typeof statusTone; children: ReactNode }) {
  return <span className={`inline-flex max-w-full rounded-md px-2 py-1 text-xs font-medium leading-4 ${statusTone[tone]}`}>{children}</span>
}

export function FestivalRecord({ number, name, attendance, fulfillment, children }: {
  number: number
  name: string
  attendance: ReactNode
  fulfillment: ReactNode
  children: ReactNode
}) {
  return (
    <li>
      <details className="group rounded-xl border border-stone-200 bg-white open:border-stone-300">
        <summary className="grid min-h-16 cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3.5 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 md:px-4 [&::-webkit-details-marker]:hidden">
          <span className="self-start pt-0.5 text-xs font-medium tabular-nums text-stone-600 md:self-center md:pt-0">{number}.</span>
          <span className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-center md:gap-4">
            <span className="min-w-0 break-words text-sm font-semibold leading-5 text-stone-950 sm:text-[15px]">{name}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-1.5 md:contents">
              <span className="flex min-w-0 flex-wrap gap-1.5">{attendance}</span>
              <span className="min-w-0">{fulfillment}</span>
            </span>
          </span>
          <span className="flex size-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600">
            <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
          </span>
        </summary>
        <div className="grid min-w-0 gap-x-4 gap-y-4 border-t border-stone-200 px-3.5 py-4 text-sm leading-6 text-stone-700 sm:grid-cols-2 md:grid-cols-3 md:px-4">
          {children}
        </div>
      </details>
    </li>
  )
}

export function FestivalDetailGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <p className="mb-1 text-xs font-semibold text-stone-900">{label}</p>
      {children}
    </div>
  )
}

export function FestivalPagination({ page, pageSize, total, onPage }: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize))
  if (lastPage === 1 && page === 1) return null
  return (
    <nav aria-label="List pagination" className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 pt-1 text-sm">
      <button type="button" className={festivalControl} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft className="size-4" aria-hidden="true" /><span className="hidden sm:inline">Previous</span>
      </button>
      <span className="text-center tabular-nums text-stone-600">Page {page} of {lastPage}</span>
      <button type="button" className={festivalControl} onClick={() => onPage(page + 1)} disabled={page >= lastPage} aria-label="Next page">
        <span className="hidden sm:inline">Next</span><ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </nav>
  )
}
