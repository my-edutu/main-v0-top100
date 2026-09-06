'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import EventInvitationsSection from '../../event-invitations-section'

export default function EventsPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection
      className="hub-events-route"
      title="Events"
      description="Upcoming gatherings and programmes."
    >
      <EventInvitationsSection member={member} />
    </RouteSection>
  )
}
