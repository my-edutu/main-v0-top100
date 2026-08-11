'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import OpportunitiesSection from '../../opportunities-section'

export default function OpportunitiesPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection
      eyebrow="Openings"
      title="Opportunities"
      description="Explore grants, roles and programmes matched to your membership access."
    >
      <OpportunitiesSection member={member} />
    </RouteSection>
  )
}
