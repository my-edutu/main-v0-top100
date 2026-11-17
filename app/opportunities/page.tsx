import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'
import { TalentOpportunities } from '@/components/talent/opportunities'
export const dynamic='force-dynamic'
export const metadata: Metadata = {
  title: 'Opportunities',
  description: 'Explore public opportunities shared with the Top100 network, with clear application information and eligibility guidance.',
  ...ogMetadata(pageOg('/opportunities'), { url: '/opportunities' }),
}
export default function PublicOpportunitiesPage(){if(!talentDiscoveryEnabled())notFound();return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><TalentOpportunities/></main>}
