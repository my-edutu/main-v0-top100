import type { ReactNode } from 'react'
import { requireConfirmedAwardAccess } from '@/lib/awards/access-server'

export const dynamic = 'force-dynamic'

export default async function PortfolioCoverLayout({ children }: { children: ReactNode }) {
  await requireConfirmedAwardAccess('/dashboard/me/portfolio-cover')
  return children
}
