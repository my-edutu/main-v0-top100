'use client'

import { useParams, useRouter } from 'next/navigation'

import { RouteSection } from '../../../_components/route-section'
import { groupExitDestination } from '../../../_lib/navigation'
import { useDashboardMember } from '../../../_providers/dashboard-member'
import GroupsSection from '../../../groups-section'

export default function GroupDetailPage() {
  const { member } = useDashboardMember()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  return (
    <RouteSection
      eyebrow="Community"
      title="Group conversation"
      description="Read the group details and continue the member conversation."
    >
      <GroupsSection
        member={member}
        selectedGroupId={id}
        onGroupSelected={(groupId) => router.push(`/dashboard/discover/groups/${encodeURIComponent(groupId)}`)}
        onGroupExited={() => router.replace(groupExitDestination())}
      />
    </RouteSection>
  )
}
