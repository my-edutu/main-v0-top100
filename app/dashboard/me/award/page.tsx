'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { AwardRouteLoading } from '../../awards-section'
import type { AwardPaymentReturnState } from '../../award-payment-view'
import { AwardIntroduction } from '../../_components/award-introduction'
import { AwardPaymentFaq } from '../../_components/award-payment-faq'

function AwardOverviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const payment = searchParams.get('payment')
  const returnState: AwardPaymentReturnState =
    payment === 'done' || payment === 'cancelled'
      ? payment
      : 'none'
  const demoReturn = searchParams.get('demo') === '1' && returnState === 'done'

  useEffect(() => {
    if (returnState === 'none') return

    const nextParams = new URLSearchParams({ payment: returnState })
    if (demoReturn) nextParams.set('demo', '1')
    router.replace(`/dashboard/me/award/payment?${nextParams.toString()}`, { scroll: false })
  }, [demoReturn, returnState, router])

  if (returnState !== 'none') {
    return <AwardRouteLoading label="Opening your award payment status" />
  }

  return (
    <div className="space-y-6">
      <AwardIntroduction />
      <AwardPaymentFaq />
    </div>
  )
}

export default function AwardOverviewPage() {
  return (
    <Suspense fallback={<AwardRouteLoading label="Loading your award return" />}>
      <AwardOverviewContent />
    </Suspense>
  )
}
