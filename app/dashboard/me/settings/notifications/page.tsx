'use client'

import { RouteSection } from '../../../_components/route-section'
import { NotificationSettingsSection } from '../../../_sections/settings-sections'

export default function NotificationSettingsPage() {
  return (
    <RouteSection eyebrow="Settings" title="Notifications" description="Pick the member-hub updates that deserve your attention.">
      <NotificationSettingsSection />
    </RouteSection>
  )
}
