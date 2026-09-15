import type { ReactNode } from 'react'

import { requireConfirmedAwardAccess } from '@/lib/awards/access-server'

export const dynamic = 'force-dynamic'

export default async function AwardCompleteLayout({ children }: { children: ReactNode }) {
  await requireConfirmedAwardAccess('/dashboard/me/award/complete')
  return children
}
