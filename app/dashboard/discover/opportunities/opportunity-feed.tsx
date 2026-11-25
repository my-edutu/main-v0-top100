'use client'

import OpportunitiesSection from '../../opportunities-section'
import { useDashboardMember } from '../../_providers/dashboard-member'

export default function OpportunityFeed() {
  const { member } = useDashboardMember()

  return (
    <div className="py-4 pb-24 sm:py-6">
      <OpportunitiesSection member={member} />
    </div>
  )
}
