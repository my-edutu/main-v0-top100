'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { SettingsOverview } from '../../_sections/settings-sections'

export default function SettingsPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection title="Settings" description="Manage your visibility, alerts and privacy.">
      <SettingsOverview member={member} />
    </RouteSection>
  )
}
