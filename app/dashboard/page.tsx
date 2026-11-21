import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { TalentDashboardCallout } from '@/components/talent/dashboard-callout'
import { ProgrammeCard } from './_components/programme-card'
import { DashboardHome } from './_components/dashboard-home'
import { programmes } from './discover/programmes/roadmap'

const programmesPath = '/dashboard/discover/programmes'
const featuredProgrammes = programmes.slice(0, 6)
function FutureProgrammes() {
  return (
    <section aria-labelledby="future-programmes-title" className="hub-upcoming-events min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 id="future-programmes-title" className="hub-panel-title">Future programmes</h2>
        <Link href={programmesPath} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-semibold text-[#8e3a12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
          See all programmes <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
      <div className="hub-events-rail mt-3" tabIndex={0} role="region" aria-label="Future programme highlights">
        {featuredProgrammes.map(programme => <ProgrammeCard key={programme.slug} programme={programme} inRail />)}
      </div>
    </section>
  )
}

export default function MemberDashboardPage() {
  return <><TalentDashboardCallout /><DashboardHome futureProgrammes={<FutureProgrammes />} /></>
}
