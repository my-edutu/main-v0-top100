'use client'

import { RouteSection } from '../../../_components/route-section'
import { useDashboardMember } from '../../../_providers/dashboard-member'
import OpportunitiesSection from '../../../opportunities-section'

export default function SavedOpportunitiesPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection
      eyebrow="Bookmarks"
      title="Saved opportunities"
      description="Return to the grants, roles and programmes you saved for later."
    >
      <OpportunitiesSection member={member} initialSavedOnly />
    </RouteSection>
  )
}
