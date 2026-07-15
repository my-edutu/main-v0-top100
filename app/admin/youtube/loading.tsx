import { Skeleton } from '@/components/ui/skeleton'

export default function YouTubeLoading() {
  return (
    <div
      className="space-y-6 sm:space-y-8 pt-20 lg:pt-0"
      aria-busy="true"
      aria-label="Loading channel"
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

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <Skeleton className="aspect-video w-full rounded-none bg-zinc-200" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-5 w-full rounded bg-zinc-100" />
              <Skeleton className="h-4 w-3/4 rounded bg-zinc-100" />
              <div className="flex justify-between pt-1">
                <Skeleton className="h-4 w-20 rounded bg-zinc-100" />
                <Skeleton className="h-4 w-16 rounded bg-zinc-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
