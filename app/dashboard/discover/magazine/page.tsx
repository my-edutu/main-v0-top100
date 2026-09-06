'use client'

import { useDashboardMember } from '../../_providers/dashboard-member'
import { MagazineSection } from '../../_sections/magazine-section'

export default function MagazinePage() {
  useDashboardMember()

  return (
      <MagazineSection />
  )
}
