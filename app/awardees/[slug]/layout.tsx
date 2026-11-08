import type { ReactNode } from 'react'
import { getPublishedTalentProfile } from '@/lib/talent/public-query'
import type { TalentPublicProfile } from '@/lib/talent/types'
import { TalentPortfolio } from '@/components/talent/portfolio'
import { TalentProfileAttachment } from '@/components/talent/profile-attachment'
export const dynamic = 'force-dynamic'
export default async function AwardeeTalentLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let talent: TalentPublicProfile | null = null
  try { talent = await getPublishedTalentProfile(slug) } catch { /* Keep existing recognition content available if talent storage is offline. */ }
  return talent ? <TalentProfileAttachment slug={slug} portfolio={<TalentPortfolio profile={talent} />}>{children}</TalentProfileAttachment> : <>{children}</>
}
