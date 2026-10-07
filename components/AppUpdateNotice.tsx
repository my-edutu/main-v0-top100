'use client'

import { useEffect, useRef, useState } from 'react'

export default function AppUpdateNotice() {
  const [available, setAvailable] = useState(false)
  const edited = useRef(false)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    const current = process.env.NEXT_PUBLIC_APP_RELEASE
    if (!current) return
    let stopped = false
    let checking = false
    const controller = new AbortController()
    async function check() {
      if (checking || document.visibilityState !== 'visible') return
      checking = true
      try {
        const response = await fetch('/api/app-version', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) return
        const data = await response.json()
        if (!stopped && typeof data.version === 'string' && data.version !== 'development' && data.version !== current) setAvailable(true)
        // Update an existing push worker without asking for notification access.
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration()
          if (registration) void registration.update().catch(() => {})
        }
      } catch { /* Offline and transient failures shouldn't interrupt the app. */ }
      finally { checking = false }
    }
    const markEdited = () => { edited.current = true }
    document.addEventListener('input', markEdited)
    document.addEventListener('change', markEdited)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    const interval = window.setInterval(check, 5 * 60 * 1000)
    void check()
    return () => {
      stopped = true
      controller.abort()
      window.clearInterval(interval)
      document.removeEventListener('input', markEdited)
      document.removeEventListener('change', markEdited)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
    }
  }, [])

  if (!available) return null
  return (
    <aside role="status" aria-live="polite" className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[100] mx-auto flex max-w-lg flex-wrap items-center gap-3 rounded-2xl border border-orange-200 bg-white p-4 text-slate-950 shadow-xl">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Top100 has been updated</p>
        <p className="text-sm text-slate-600">Save your work, then refresh to get the latest version.</p>
      </div>
      <button type="button" className="rounded-full bg-orange-600 px-4 py-2 font-semibold text-white" onClick={() => {
        if (edited.current && !window.confirm('Have you saved your work and finished any uploads? Refreshing will discard unsaved changes.')) return
        window.location.reload()
      }}>Refresh now</button>
    </aside>
  )
}
