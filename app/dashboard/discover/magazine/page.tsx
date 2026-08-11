'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { MagazineSection } from '../../_sections/magazine-section'

export default function MagazinePage() {
  useDashboardMember()

  return (
    <RouteSection
      eyebrow="Stories"
      title="Magazine"
      description="Read AFL editions or send your own work to the editorial team."
    >
      <MagazineSection />
    </RouteSection>
  )
}
