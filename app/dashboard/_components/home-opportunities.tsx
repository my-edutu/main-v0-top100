'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { fetchMemberOpportunities } from '@/lib/opportunities/client'
import type { EdutuOpportunity } from '@/lib/opportunities/edutu'
import { hasOpportunityExpired, opportunityDeadlineDay, type Opportunity } from '@/lib/opportunities/types'
import { fetchEdutuPage, OpportunityCard } from '../opportunities-section'

const MAX_HIGHLIGHTS = 10

type Listing = Opportunity | EdutuOpportunity

export function HomeOpportunities() {
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const today = opportunityDeadlineDay()

  useEffect(() => {
    let active = true
    void Promise.allSettled([fetchMemberOpportunities(), fetchEdutuPage('', '')]).then(([member, edutu]) => {
      if (!active) return

      const available = [
        ...(member.status === 'fulfilled' ? member.value : []),
        ...(edutu.status === 'fulfilled' ? edutu.value.opportunities : []),
      ].filter(item => item.status === 'published' && !hasOpportunityExpired(item.deadline, today))
      const unique = Array.from(new Map(available.map(item => [item.id, item])).values())

      // Sample without replacement. Keep the order stable until the next load.
      for (let index = 0; index < Math.min(MAX_HIGHLIGHTS, unique.length); index += 1) {
        const selected = index + Math.floor(Math.random() * (unique.length - index))
        const listing = unique[index]
        unique[index] = unique[selected]
        unique[selected] = listing
      }

      setListings(unique.slice(0, MAX_HIGHLIGHTS))
      setUnavailable(member.status === 'rejected' || edutu.status === 'rejected')
    })
    return () => { active = false }
  }, [today])

  return (
    <section className="hub-launch-rail min-w-0" aria-labelledby="home-opportunities-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="home-opportunities-title" className="hub-panel-title">Opportunities</h2>
        <Link href="/dashboard/discover/opportunities" className="inline-flex min-h-11 items-center text-xs font-semibold underline underline-offset-4">Browse all</Link>
      </div>
      {listings === null ? (
        <p role="status" className="text-sm text-neutral-600">Loading opportunities…</p>
      ) : listings.length ? (
        <div className="flex snap-x gap-4 overflow-x-auto pb-2 pr-2" role="region" aria-label="Opportunity highlights" tabIndex={0}>
          {listings.map(opportunity => (
            <div key={opportunity.id} className="w-[min(82vw,320px)] shrink-0 snap-start [&>button]:w-full">
              <OpportunityCard opportunity={opportunity} deadlineDay={today} compact />
            </div>
          ))}
        </div>
      ) : (
        <p role="status" className="text-sm text-neutral-600">
          {unavailable ? 'Opportunities could not load right now.' : 'There are no open opportunities right now.'}
        </p>
      )}
    </section>
  )
}
