import { ArrowRight } from "lucide-react"
import Link from "next/link"

import type { Speaker } from "@/lib/speakers"

import SpeakerCard from "./SpeakerCard"

export default function HallOfFamePreview({ speakers }: { speakers: readonly Speaker[] }) {
  return (
    <section className="overflow-hidden bg-slate-950 py-14 text-[#fff] sm:py-20">
      <div className="container">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">
            Hall of Fame
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            Leaders who chose impact
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Meet previous speakers who have inspired and supported the Top100 community by
            sharing what leadership looks like in practice.
          </p>
        </div>

        <div className="-mx-4 mt-9 grid auto-cols-[minmax(16rem,72vw)] grid-flow-col gap-5 overflow-x-auto px-4 pb-6 [scrollbar-width:none] snap-x snap-mandatory sm:-mx-6 sm:auto-cols-[minmax(18rem,42vw)] sm:px-6 lg:mx-0 lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible lg:px-0">
          {speakers.map((speaker, index) => (
            <SpeakerCard key={speaker.slug} speaker={speaker} priority={index === 0} />
          ))}
        </div>

        <Link
          href="/hall-of-fame"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-700 px-6 py-3 font-semibold text-[#fff] transition hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
        >
          View the Hall of Fame <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
