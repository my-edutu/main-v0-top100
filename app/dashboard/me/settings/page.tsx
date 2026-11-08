'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { SettingsOverview } from '../../_sections/settings-sections'
import { TalentVisibilitySettings } from '@/components/talent/visibility-settings'

export default function SettingsPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection title="Settings" description="Manage your visibility, alerts and privacy.">
      <TalentVisibilitySettings />
      <SettingsOverview member={member} />
    </RouteSection>
  )
}
