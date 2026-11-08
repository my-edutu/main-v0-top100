import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
import { TalentOpportunities } from '@/components/talent/opportunities'
export const dynamic='force-dynamic'
export const metadata:Metadata={title:'Opportunities | Top100 Africa Future Leaders',description:'Explore public opportunities shared with the Top100 network, with clear application information and eligibility guidance.'}
export default function PublicOpportunitiesPage(){if(!talentDiscoveryEnabled())notFound();return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><TalentOpportunities/></main>}
