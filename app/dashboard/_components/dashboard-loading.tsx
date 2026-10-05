import { LoaderCircle } from 'lucide-react'

export function DashboardLoading({ label = 'Loading', compact = false }: { label?: string; compact?: boolean }) {
  return <div role="status" aria-label={label} className={`grid w-full place-items-center ${compact ? 'min-h-24' : 'min-h-[240px]'}`}>
    <LoaderCircle className="size-6 animate-spin text-orange-600 motion-reduce:animate-none" aria-hidden="true" />
    <span className="sr-only">{label}</span>
  </div>
}
