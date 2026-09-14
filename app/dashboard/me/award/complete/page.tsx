'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AwardOptions } from '../../../_components/award-options'
import { AwardRouteLoading } from '../../../awards-section'
import { paymentIsConfirmed } from '../../../award-payment-view'
import type { AwardPaymentView } from '@/lib/awards/payment'

export default function AwardCompletePage() {
  const router = useRouter()
  const [view, setView] = useState<AwardPaymentView | null>(null)
  const [error, setError] = useState('')

  const loadPayment = useCallback(async () => {
    try {
      const response = await fetch('/api/member/award/payment', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.message || 'Could not verify your award payment.')
      setView(body as AwardPaymentView)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify your award payment.')
    }
  }, [])

  useEffect(() => {
    void loadPayment()
  }, [loadPayment])

  useEffect(() => {
    if (view && !paymentIsConfirmed(view)) router.replace('/dashboard/me/award?intro=continued')
  }, [router, view])

  if (error) {
    return (
      <section role="alert" className="rounded-[22px] border border-rose-200 bg-white p-5 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#171412]">Your awards could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[#625B52]">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError('')
            setView(null)
            void loadPayment()
          }}
          className="mt-5 min-h-11 rounded-xl bg-[#171412] px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </section>
    )
  }

  if (!view || !paymentIsConfirmed(view)) {
    return <AwardRouteLoading label="Verifying your award payment" />
  }

  return <AwardOptions />
}
