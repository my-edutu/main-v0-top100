import { Skeleton } from '@/components/ui/skeleton'

export default function EventsLoading() {
  return (
    <div
      className="space-y-6 sm:space-y-8 pt-20 lg:pt-0"
      aria-busy="true"
      aria-label="Loading programs"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 rounded bg-zinc-200/70" />
          <Skeleton className="h-9 w-56 rounded-lg bg-zinc-200" />
          <Skeleton className="h-4 w-72 max-w-full rounded bg-zinc-200/70" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl bg-zinc-200" />
      </div>

      {/* Event rows */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              <Skeleton className="h-40 w-full sm:h-32 sm:w-32 rounded-lg bg-zinc-200 shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-3/4 rounded bg-zinc-100" />
                <Skeleton className="h-4 w-1/2 rounded bg-zinc-100" />
                <Skeleton className="h-4 w-full rounded bg-zinc-100" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-8 w-24 rounded-lg bg-zinc-100" />
                  <Skeleton className="h-8 w-24 rounded-lg bg-zinc-100" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
