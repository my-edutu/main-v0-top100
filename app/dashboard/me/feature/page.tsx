'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import { FeatureSection } from '../../_sections/feature-section'
import { MagazinePaymentGate } from './magazine-payment-gate'

export default function FeaturePage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection title="2026 magazine feature" description="Share your work with the AFL editorial team.">
      <MagazinePaymentGate member={member}><FeatureSection member={member} /></MagazinePaymentGate>
    </RouteSection>
  )
}
