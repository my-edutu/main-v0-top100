'use client'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** The layout also wraps awardee posts; attach talent content only to the profile. */
export function TalentProfileAttachment({ slug, children, portfolio }: { slug: string; children: ReactNode; portfolio: ReactNode }) {
  const pathname = usePathname()
  const parts = pathname?.split('/').filter(Boolean) ?? []
  let profileRoute = false
  try { profileRoute = parts.length === 2 && parts[0] === 'awardees' && decodeURIComponent(parts[1]) === slug } catch { /* Invalid path: keep the existing page, without an attachment. */ }
  return <>{profileRoute && <nav className="border-b border-orange-100 bg-orange-50 px-5 py-3 text-center text-sm text-orange-900" aria-label="Talent portfolio"><a href="#talent-portfolio" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Explore this member’s skills, selected work and opportunity interests</a></nav>}{children}{profileRoute && portfolio}</>
}
