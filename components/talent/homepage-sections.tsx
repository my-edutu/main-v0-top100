import Link from 'next/link'
import { Search } from 'lucide-react'
import ImpactBackgroundVideo from '@/app/components/ImpactBackgroundVideo'

export function TalentDiscoveryHomeSection() {
  return (
    <section aria-labelledby="home-talent-title" className="-mt-[var(--section-gap,0px)] scroll-mt-24">
      <div className="relative isolate overflow-hidden bg-[#17120f] text-white">
        <ImpactBackgroundVideo deferUntilVisible />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#17120f40_0%,#17120fbc_35%,#17120ff5_100%)] md:bg-[linear-gradient(90deg,#17120ff5_0%,#17120fdc_45%,#17120f52_100%)]" />

        <div className="container relative pb-20 pt-36 sm:pt-40 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Impact Beyond Recognition</p>
          <h2 id="home-talent-title" className="mt-4 max-w-xl scroll-mt-[18rem] text-3xl font-semibold leading-tight tracking-tight text-[#fff] sm:scroll-mt-44 sm:text-4xl lg:text-5xl">
            Recognition opens a door.<br />
            <span className="text-orange-300">Opportunity is what comes next.</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-stone-100">
            Meet young African leaders, see what they’ve built, and find people whose skills fit your team.
          </p>
          <Link
            href="/awardees"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-orange-700 px-5 py-2.5 text-sm font-semibold text-[#fff] transition hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          >
            Discover talent <Search size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
