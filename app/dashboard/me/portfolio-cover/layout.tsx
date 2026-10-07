import type { ReactNode } from 'react'
import { requireSignedInAwardeeAccess } from '@/lib/awards/access-server'

export const dynamic = 'force-dynamic'

export default async function PortfolioCoverLayout({ children }: { children: ReactNode }) {
  await requireSignedInAwardeeAccess('/dashboard/me/portfolio-cover')
  return children
}
