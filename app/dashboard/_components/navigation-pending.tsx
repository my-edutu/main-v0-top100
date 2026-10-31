'use client'

import { useLinkStatus } from 'next/link'

/** Keep the hint inside its Link so Next owns cancellation and completion. */
export function NavigationPending() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return <span role="status" className="pointer-events-none absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-orange-600 motion-safe:animate-pulse">
    <span className="sr-only">Opening page</span>
  </span>
}
