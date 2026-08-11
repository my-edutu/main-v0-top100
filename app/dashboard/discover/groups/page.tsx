'use client'

import { useRouter } from 'next/navigation'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import GroupsSection from '../../groups-section'

export default function GroupsPage() {
  const { member } = useDashboardMember()
  const router = useRouter()

  return (
    <RouteSection
      eyebrow="Communities"
      title="Groups"
      description="Browse member communities, then open a group at its durable URL."
    >
      <GroupsSection
        member={member}
        onGroupSelected={(groupId) => router.push(`/dashboard/discover/groups/${encodeURIComponent(groupId)}`)}
      />
    </RouteSection>
  )
}
