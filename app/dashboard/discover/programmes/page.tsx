import Link from 'next/link'

import { ProgrammeCard } from '../../_components/programme-card'
import { ProgrammeInterest } from './programme-interest'
import { programmes } from './roadmap'

const base = '/dashboard/discover/programmes'
const months = [...new Set(programmes.map(programme => programme.month))]

export default function ProgrammesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-[#211d19] sm:text-4xl">2027 programmes</h1>
        <p className="max-w-xl text-sm leading-6 text-[#625b52] sm:text-base">
          Explore Top100’s plans for the year. Confirmed dates and signups will appear as programmes open.
        </p>
        <nav aria-label="Programme links" className="flex flex-wrap gap-x-5 text-sm font-semibold text-[#9a3412]">
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href={`${base}/community-impact-onboarding`}>Community Impact Network</Link>
          <a className="inline-flex min-h-11 items-center underline underline-offset-4" href="#open-programmes">Open for interest</a>
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/dashboard/discover/events">Upcoming events</Link>
          <Link className="inline-flex min-h-11 items-center underline underline-offset-4" href="/dashboard/discover/opportunities">Browse opportunities</Link>
        </nav>
      </header>

      <div id="2027-roadmap" className="scroll-mt-24 space-y-8">
        {months.map(month => (
          <section key={month} aria-label={`${month} programmes`} className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight text-[#211d19]">{month}</h2>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {programmes.filter(programme => programme.month === month).map(programme => (
                <li key={programme.slug} id={programme.anchor} className="min-w-0 scroll-mt-24">
                  <ProgrammeCard programme={programme} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <ProgrammeInterest />
    </div>
  )
}
