'use client'

import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'

export default function AwardRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <section role="alert" className="rounded-[20px] border border-rose-200 bg-white p-5 sm:p-7">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#171412]">This award step did not open</h1>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#625B52]">{error.message || 'Try this award step again.'}</p>
      <Button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-[#171412] text-white hover:bg-[#312B27]">
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </section>
  )
}
