'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { WhatsAppGroupsSection } from './whatsapp-groups-section'

export default function GroupsPage() {
  const { member } = useDashboardMember()
  const approved = member.status === 'approved'

  return (
    <RouteSection
      eyebrow="Connect"
      title="Your WhatsApp group"
      description="Meet and connect with fellow Africa Future Leaders."
      className={approved ? 'whatsapp-groups-route' : undefined}
    >
      <WhatsAppGroupsSection
        approved={approved}
        isDemoPreview={process.env.NODE_ENV !== 'production' && member.id === 'demo-member-1'}
      />
    </RouteSection>
  )
}
