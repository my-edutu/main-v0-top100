'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { FeatureSection } from '../../_sections/feature-section'

export default function FeaturePage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection eyebrow="Tell your story" title="Get featured" description="Pitch your work and follow each submission through editorial review.">
      <FeatureSection member={member} />
    </RouteSection>
  )
}
