'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import EventInvitationsSection from '../../event-invitations-section'

export default function EventsPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection
      eyebrow="Gatherings"
      title="Events"
      description="Respond to member invitations and browse public AFL events."
    >
      <EventInvitationsSection member={member} />
    </RouteSection>
  )
}
