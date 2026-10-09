'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackToLeaders({ year }: { year?: number | string | null }) {
  const router = useRouter()
  const fallback = year ? `/awardees?year=${encodeURIComponent(String(year))}` : '/awardees'

  return (
    <Link
      href={fallback}
      className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-600 transition-colors hover:text-[#A94412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]"
      onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
        if (window.history.length > 1) {
          event.preventDefault()
          router.back()
        }
      }}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      <span>Back to Leaders</span>
    </Link>
  )
}
