'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { DirectorySection } from '../../_sections/directory-section'
import { TalentDirectory } from '@/components/talent/directory'

export default function MembersPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection className="hub-members-route" title="Member directory" description="Explore talent and awardee cohorts.">
      <TalentDirectory compact archive={<DirectorySection member={member} />} />
    </RouteSection>
  )
}
