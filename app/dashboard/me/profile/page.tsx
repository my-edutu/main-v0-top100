'use client'

import { RouteSection } from '../../_components/route-section'
import { ProfileSection } from '../../_sections/profile-section'

export default function ProfilePage() {
  return (
    <RouteSection eyebrow="Your public presence" title="BIO and profile" description="Keep your awardee story current for the directory and public profile.">
      <ProfileSection />
    </RouteSection>
  )
}
