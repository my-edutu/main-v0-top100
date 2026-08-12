'use client'

import AwardsSection from '../../../awards-section'
import { useDashboardBadges } from '../../../_providers/dashboard-badges'
import { useDashboardMember } from '../../../_providers/dashboard-member'

export default function AwardTrackingPage() {
  const { member } = useDashboardMember()
  const { setAwardNeedsAttention } = useDashboardBadges()

  return (
    <AwardsSection
      member={member}
      step="tracking"
      onClaimStateChange={setAwardNeedsAttention}
    />
  )
}
