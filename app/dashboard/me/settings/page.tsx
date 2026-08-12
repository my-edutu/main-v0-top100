'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { SettingsOverview } from '../../_sections/settings-sections'

export default function SettingsPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection eyebrow="Your preferences" title="Settings" description="Manage one responsibility at a time without affecting your BIO allowance.">
      <SettingsOverview member={member} />
    </RouteSection>
  )
}
