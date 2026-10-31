export function DashboardLoading({ label = 'Loading', compact = false, fullScreen = false }: { label?: string; compact?: boolean; fullScreen?: boolean }) {
  return <div role="status" aria-label={label} aria-busy="true" className={`w-full ${fullScreen ? 'min-h-[100dvh] bg-white px-5 py-8 sm:px-8' : compact ? 'min-h-24 py-4' : 'min-h-[240px] py-4'}`}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className={`mx-auto w-full space-y-6 motion-safe:animate-pulse ${fullScreen ? 'max-w-5xl' : ''}`}>
      {fullScreen && <div className="flex h-12 items-center justify-between border-b border-neutral-100 pb-4"><div className="h-7 w-24 rounded-md bg-orange-100" /><div className="size-9 rounded-full bg-neutral-100" /></div>}
      <div className="space-y-3"><div className="h-3 w-24 rounded bg-neutral-100" /><div className="h-7 w-48 max-w-full rounded-md bg-neutral-200" /><div className="h-3 w-64 max-w-full rounded bg-neutral-100" /></div>
      <div className={`grid gap-4 ${compact ? '' : 'sm:grid-cols-2'}`}>
        {Array.from({ length: compact ? 1 : 2 }, (_, index) => <div key={index} className="min-w-0 rounded-2xl border border-neutral-200 p-5">
          <div className="mb-5 size-10 rounded-xl bg-orange-50" />
          <div className="h-4 w-3/5 rounded bg-neutral-200" />
          <div className="mt-3 h-3 w-full rounded bg-neutral-100" />
          <div className="mt-2 h-3 w-4/5 rounded bg-neutral-100" />
          {fullScreen && <div className="mt-6 h-10 w-28 rounded-xl bg-neutral-100" />}
        </div>)}
      </div>
    </div>
  </div>
}
