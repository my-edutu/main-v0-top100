'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { FeatureSection } from '../../_sections/feature-section'

export default function FeaturePage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection title="Get featured" description="Share your work with the AFL editorial team.">
      <FeatureSection member={member} />
    </RouteSection>
  )
}
