import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div
      className="space-y-6 pt-20 lg:pt-0"
      aria-busy="true"
      aria-label="Loading settings"
    >
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 rounded-lg bg-zinc-200" />
        <Skeleton className="h-4 w-72 max-w-full rounded bg-zinc-200/70" />
      </div>

      {/* Tab bar */}
      <div className="grid grid-cols-4 lg:grid-cols-10 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 rounded-lg bg-zinc-200" />
        ))}
      </div>

      {/* Settings sections */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
            <Skeleton className="h-6 w-40 rounded bg-zinc-200" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48 max-w-full rounded bg-zinc-100" />
                    <Skeleton className="h-4 w-64 max-w-full rounded bg-zinc-100" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full bg-zinc-100 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
