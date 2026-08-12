'use client'

import { RouteSection } from '../../../_components/route-section'
import { VisibilitySettingsSection } from '../../../_sections/settings-sections'

export default function VisibilitySettingsPage() {
  return (
    <RouteSection eyebrow="Settings" title="Visibility" description="Choose how fellow members can find and contact you.">
      <VisibilitySettingsSection />
    </RouteSection>
  )
}
