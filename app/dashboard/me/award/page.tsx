'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import AwardsSection, { AwardRouteLoading } from '../../awards-section'
import { useDashboardBadges } from '../../_providers/dashboard-badges'
import { useDashboardMember } from '../../_providers/dashboard-member'

function AwardOverviewContent() {
  const searchParams = useSearchParams()
  const { member } = useDashboardMember()
  const { setAwardNeedsAttention } = useDashboardBadges()

  return (
    <AwardsSection
      member={member}
      paymentPending={searchParams.get('payment') === 'done'}
      onClaimStateChange={setAwardNeedsAttention}
    />
  )
}

export default function AwardOverviewPage() {
  return (
    <Suspense fallback={<AwardRouteLoading label="Loading your award return" />}>
      <AwardOverviewContent />
    </Suspense>
  )
}
