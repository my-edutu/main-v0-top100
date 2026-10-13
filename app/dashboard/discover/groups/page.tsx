'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { WhatsAppGroupsSection } from './whatsapp-groups-section'

export default function GroupsPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection
      eyebrow="Connect"
      title="Your WhatsApp group"
      description="Meet and connect with fellow Africa Future Leaders."
    >
      <WhatsAppGroupsSection
        approved={member.status === 'approved'}
        isDemoPreview={process.env.NODE_ENV !== 'production' && member.id === 'demo-member-1'}
      />
    </RouteSection>
  )
}
