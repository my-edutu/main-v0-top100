import type { ReactNode } from 'react'

import { requireConfirmedAwardAccess } from '@/lib/awards/access-server'

export const dynamic = 'force-dynamic'

export default async function AwardDeliveryLayout({ children }: { children: ReactNode }) {
  await requireConfirmedAwardAccess('/dashboard/me/award/delivery')
  return children
}
