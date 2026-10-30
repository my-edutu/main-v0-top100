'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function WorkspaceRefresh() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible')
        startTransition(() => router.refresh())
    }
    const interval = window.setInterval(refresh, 60_000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
    }
  }, [router])
  return (
    <button
      className="btn btn-ghost rounded-xl"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      aria-label={pending ? 'Refreshing dashboard' : 'Refresh dashboard'}
    >
      <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} />
      <span>{pending ? 'Refreshing…' : 'Refresh'}</span>
    </button>
  )
}
