'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { DirectorySection } from '../../_sections/directory-section'

export default function MembersPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection
      eyebrow="People"
      title="Member directory"
      description="Find awardees by cohort, country or field and continue the conversation in Messages."
    >
      <DirectorySection member={member} />
    </RouteSection>
  )
}
