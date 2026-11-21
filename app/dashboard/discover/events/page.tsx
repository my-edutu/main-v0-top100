'use client'

import Link from 'next/link'
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
      <Link href="/dashboard/discover/programmes#2027-roadmap" className="inline-block py-2 text-sm font-medium underline underline-offset-4">See the planned 2027 calendar</Link>
      <EventInvitationsSection member={member} />
    </RouteSection>
  )
}
