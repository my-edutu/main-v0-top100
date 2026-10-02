'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AwardRouteLoading } from '../../../awards-section'
import { AwardPaymentSuccess } from '../../../award-payment-success'
import { paymentIsConfirmed } from '../../../award-payment-view'
import { claimAwardPaymentSuccess } from '@/lib/awards/payment-success-visit'
import type { AwardPaymentView } from '@/lib/awards/payment'

export default function AwardCompletePage() {
  const router = useRouter()
  const [view, setView] = useState<AwardPaymentView | null>(null)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState<boolean | null>(null)
  const successDecision = useRef<boolean | null>(null)

  const loadPayment = useCallback(async () => {
    try {
      const response = await fetch('/api/member/award/payment', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.message || 'Could not verify your award payment.')
      const paymentView = body as AwardPaymentView
      setView(paymentView)
      const isPaymentReturn = new URLSearchParams(window.location.search).get('payment') === 'done'
      const confirmedPayment = paymentView.confirmedPayment
      let shouldShowSuccess = false
      if (isPaymentReturn && confirmedPayment) {
        // Repeated loads on this visit must preserve the first decision. React
        // Strict Mode replays effects in development; a second storage claim
        // would otherwise hide the receipt immediately after showing it.
        if (successDecision.current === null) {
          try {
            successDecision.current = claimAwardPaymentSuccess(window.localStorage, confirmedPayment)
          } catch {
            // Storage restrictions should not prevent the just-confirmed receipt from appearing.
            successDecision.current = true
          }
        }
        shouldShowSuccess = successDecision.current
      }
      setShowSuccess(shouldShowSuccess)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify your award payment.')
    }
  }, [])

  useEffect(() => {
    void loadPayment()
  }, [loadPayment])

  useEffect(() => {
    if (view && !paymentIsConfirmed(view)) router.replace('/dashboard/me/award?intro=continued')
    else if (view && showSuccess === false) router.replace('/dashboard/me/award/payment')
  }, [router, showSuccess, view])

  if (error) {
    return (
      <section role="alert" className="rounded-[22px] border border-rose-900 bg-[#21171D] p-5 text-white sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-white">Your awards could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[#D0C9D0]">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError('')
            setView(null)
            void loadPayment()
          }}
          className="mt-5 min-h-11 rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-[#171412]"
        >
          Try again
        </button>
      </section>
    )
  }

  if (!view || !paymentIsConfirmed(view) || !view.confirmedPayment || showSuccess !== true) {
    return <AwardRouteLoading label="Verifying your award payment" />
  }

  return <AwardPaymentSuccess payment={view.confirmedPayment} />
}
