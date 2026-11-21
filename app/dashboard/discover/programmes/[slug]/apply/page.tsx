import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { allCountries } from 'country-region-data'

import { ProgrammeInterest } from '../../programme-interest'
import { programmes } from '../../roadmap'

export const metadata: Metadata = { title: 'Apply to the Community Impact Network' }

export default async function ProgrammeApplication({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!programmes.some(programme => programme.slug === slug && programme.id === 'community-impact-network')) {
    notFound()
  }

  const countries = allCountries.map(([name, code]) => ({ name, code }))
  return <div className="mx-auto max-w-3xl"><ProgrammeInterest communityOnly countries={countries} /></div>
}
