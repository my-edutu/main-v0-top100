'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { AwardRouteLoading } from '../../../awards-section'
import { paymentIsConfirmed } from '../../../award-payment-view'
import type { AwardPaymentView } from '@/lib/awards/payment'

export default function AwardDeliveryPage() {
  const router = useRouter()
  const [view, setView] = useState<AwardPaymentView | null>(null)
  const [error, setError] = useState('')

  const verifyPayment = useCallback(async () => {
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
    void verifyPayment()
  }, [verifyPayment])

  useEffect(() => {
    if (view && !paymentIsConfirmed(view)) router.replace('/dashboard/me/award?intro=continued')
  }, [router, view])

  if (error) {
    return (
      <section role="alert" className="rounded-[22px] border border-rose-200 bg-white p-5 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#171412]">Delivery details could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[#625B52]">{error}</p>
        <button type="button" onClick={() => { setError(''); setView(null); void verifyPayment() }} className="mt-5 min-h-11 rounded-xl bg-[#171412] px-4 text-sm font-semibold text-white">
          Try again
        </button>
      </section>
    )
  }

  if (!view || !paymentIsConfirmed(view)) {
    return <AwardRouteLoading label="Verifying your award payment" />
  }

  return (
    <section className="max-w-2xl space-y-6">
      <Link href="/dashboard/me/award/complete" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-orange-800 underline underline-offset-4">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to your awards
      </Link>
      <div className="rounded-[22px] border border-orange-200 bg-[#fffaf4] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-orange-100 text-orange-700">
            <Truck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Physical award</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#171412]">Arrange your delivery</h1>
            <p className="mt-3 text-sm leading-6 text-[#625B52] sm:text-base">
              Our delivery team will confirm the best delivery option and guide you through the remaining details.
            </p>
            <a href="mailto:info@top100afl.com?subject=Physical%20award%20delivery" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[linear-gradient(110deg,#f97316,#fb923c,#f59e0b)] px-5 text-sm font-semibold text-[#171412] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2">
              <Mail className="h-4 w-4" aria-hidden="true" />
              Contact the delivery team
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
