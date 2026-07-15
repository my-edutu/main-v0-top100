import { Skeleton } from '@/components/ui/skeleton'

export default function AnalyticsLoading() {
  return (
    <div
      className="space-y-6 sm:space-y-8 pt-20 lg:pt-0"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 rounded bg-zinc-200/70" />
          <Skeleton className="h-9 w-56 rounded-lg bg-zinc-200" />
          <Skeleton className="h-4 w-72 max-w-full rounded bg-zinc-200/70" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-xl bg-zinc-200" />
          <Skeleton className="h-10 w-24 rounded-xl bg-zinc-200" />
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-zinc-200" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-48 rounded bg-zinc-200" />
            <Skeleton className="h-64 w-full rounded-lg bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
