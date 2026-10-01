'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import AwardsSection, { AwardRouteLoading } from '../../../awards-section'
import { useDashboardBadges } from '../../../_providers/dashboard-badges'
import { useDashboardMember } from '../../../_providers/dashboard-member'
import type { AwardPaymentReturnState } from '../../../award-payment-view'

function AwardPaymentContent() {
  const searchParams = useSearchParams()
  const { member } = useDashboardMember()
  const { setAwardNeedsAttention } = useDashboardBadges()
  const payment = searchParams.get('payment')
  const paymentReturn: AwardPaymentReturnState =
    payment === 'done' || payment === 'cancelled' ? payment : 'none'
  const demoReturn = searchParams.get('demo') === '1' && paymentReturn === 'done'

  return (
    <div className="space-y-5">
      <AwardsSection
        member={member}
        paymentReturn={paymentReturn}
        demoReturn={demoReturn}
        onClaimStateChange={setAwardNeedsAttention}
      />
    </div>
  )
}

export default function AwardPaymentPage() {
  return (
    <Suspense fallback={<AwardRouteLoading label="Loading award payment options" />}>
      <AwardPaymentContent />
    </Suspense>
  )
}
