'use client'

import { RouteSection } from '../../_components/route-section'
import { ProfileSection } from '../../_sections/profile-section'

export default function ProfilePage() {
  return (
    <RouteSection eyebrow="Your public presence" title="Your profile" description="Review how your awardee profile appears. Update it whenever you’re ready.">
      <ProfileSection />
    </RouteSection>
  )
}
