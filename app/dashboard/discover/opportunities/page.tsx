import Link from 'next/link'

import { talentDiscoveryEnabled } from '@/lib/talent/features'
import OpportunityFeed from './opportunity-feed'

export default function OpportunitiesPage() {
  return (
    <>
      {talentDiscoveryEnabled() && (
        <Link href="/dashboard/applications" className="inline-flex min-h-11 items-center text-sm font-semibold text-orange-800 underline">
          Open my application tracker
        </Link>
      )}
      <OpportunityFeed />
    </>
  )
}
