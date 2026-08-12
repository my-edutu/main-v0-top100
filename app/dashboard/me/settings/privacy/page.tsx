'use client'

import { RouteSection } from '../../../_components/route-section'
import { PrivacySettingsSection } from '../../../_sections/settings-sections'

export default function PrivacySettingsPage() {
  return (
    <RouteSection eyebrow="Settings" title="Privacy and security" description="Keep profile publication and account communication intentional.">
      <PrivacySettingsSection />
    </RouteSection>
  )
}
