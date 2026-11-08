import type { ReactNode } from 'react'
import { getPublishedTalentProfile } from '@/lib/talent/public-query'
import type { TalentPublicProfile } from '@/lib/talent/types'
import { TalentPortfolio } from '@/components/talent/portfolio'
export const dynamic = 'force-dynamic'
export default async function AwardeeTalentLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let talent: TalentPublicProfile | null = null
  try { talent = await getPublishedTalentProfile(slug) } catch { /* Keep the existing recognition page available if talent storage is offline. */ }
  return <>{talent && <nav className="border-b border-orange-100 bg-orange-50 px-5 py-3 text-center text-sm text-orange-900" aria-label="Talent portfolio"><a href="#talent-portfolio" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Explore this member’s skills, selected work and opportunity interests</a></nav>}{children}{talent && <TalentPortfolio profile={talent} />}</>
}
