import type { Metadata } from 'next'
import { OpportunityDetails } from './opportunity-details'

export const metadata: Metadata = { title: 'Opportunity details' }

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <OpportunityDetails key={id} id={id} />
}
