import { Skeleton } from '@/components/ui/skeleton'

export default function FeatureRequestsLoading() {
  return (
    <div
      className="container mx-auto py-8"
      aria-busy="true"
      aria-label="Loading feature requests"
    >
      {/* Header */}
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-56 rounded-lg bg-zinc-200" />
        <Skeleton className="h-4 w-72 max-w-full rounded bg-zinc-200/70" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg bg-zinc-100 shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-12 rounded bg-zinc-100" />
                <Skeleton className="h-3 w-20 rounded bg-zinc-100" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Request list */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-6 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full bg-zinc-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3 min-w-24 rounded bg-zinc-100" />
              <Skeleton className="h-3 w-1/2 rounded bg-zinc-100" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg bg-zinc-100 hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
