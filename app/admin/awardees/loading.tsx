import { Skeleton } from '@/components/ui/skeleton'

export default function AwardeesLoading() {
  return (
    <div
      className="space-y-6 sm:space-y-8 pt-20 lg:pt-0"
      aria-busy="true"
      aria-label="Loading awardees"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40 rounded bg-zinc-200/70" />
          <Skeleton className="h-9 w-64 rounded-lg bg-zinc-200" />
          <Skeleton className="h-4 w-72 max-w-full rounded bg-zinc-200/70" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl bg-zinc-200" />
          <Skeleton className="h-9 w-24 rounded-xl bg-zinc-200" />
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl bg-zinc-200" />
        ))}
      </div>

      {/* Table / list */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="p-6 space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full bg-zinc-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4 min-w-24 rounded bg-zinc-100" />
                <Skeleton className="h-3 w-1/2 rounded bg-zinc-100" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg bg-zinc-100 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
