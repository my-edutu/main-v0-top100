import type { ReactNode } from 'react'
import { requireConfirmedAwardAccess } from '@/lib/awards/access-server'

export const dynamic = 'force-dynamic'

export default async function FeatureLayout({ children }: { children: ReactNode }) {
  await requireConfirmedAwardAccess('/dashboard/me/feature')
  return children
}
