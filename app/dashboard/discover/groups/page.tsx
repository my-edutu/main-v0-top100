'use client'

import { useRouter } from 'next/navigation'

import { RouteSection } from '../../_components/route-section'
import { groupExitDestination } from '../../_lib/navigation'
import { useDashboardMember } from '../../_providers/dashboard-member'
import GroupsSection from '../../groups-section'
import { MEMBER_GROUPS_ENABLED } from '@/lib/groups/access'
import { GroupsLockedState } from '../../_components/groups-locked-state'

export default function GroupsPage() {
  const { member } = useDashboardMember()
  const router = useRouter()

  return (
    <RouteSection
      eyebrow="Communities"
      title="Groups"
      description="Member communities and group conversations."
    >
      {MEMBER_GROUPS_ENABLED ? (
        <GroupsSection
          member={member}
          onGroupSelected={(groupId) => router.push(`/dashboard/discover/groups/${encodeURIComponent(groupId)}`)}
          onGroupExited={() => router.replace(groupExitDestination())}
        />
      ) : <GroupsLockedState />}
    </RouteSection>
  )
}
