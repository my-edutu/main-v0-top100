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
      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
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
