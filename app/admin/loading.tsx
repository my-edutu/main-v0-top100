import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div
      className="space-y-8 pt-20 lg:pt-0"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40 rounded bg-zinc-200/70" />
          <Skeleton className="h-10 w-64 rounded-lg bg-zinc-200" />
          <Skeleton className="h-5 w-80 max-w-full rounded bg-zinc-200/70" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl bg-zinc-200" />
          <Skeleton className="h-9 w-28 rounded-xl bg-zinc-200" />
        </div>
      </div>

      {/* Quick Access grid */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 rounded bg-zinc-200" />
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-[2rem] bg-zinc-200" />
          ))}
        </div>
      </div>

      {/* Activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-40 rounded bg-zinc-200" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl bg-zinc-100" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4 rounded bg-zinc-100" />
                    <Skeleton className="h-2 w-1/2 rounded bg-zinc-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Top performers */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <Skeleton className="h-6 w-56 rounded bg-zinc-200" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl bg-zinc-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
