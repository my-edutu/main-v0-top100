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

        <div
          role="region"
          aria-label="Hall of Fame speakers"
          tabIndex={0}
          data-speaker-rail="compact"
          className="-mx-4 mt-9 grid auto-cols-[6.5rem] grid-flow-col gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-7 pt-2 [scrollbar-width:none] snap-x snap-proximity touch-pan-x sm:-mx-6 sm:auto-cols-[7.5rem] sm:gap-3 sm:px-6 lg:auto-cols-[8.5rem] [&::-webkit-scrollbar]:hidden"
        >
          {speakers.map((speaker, index) => (
            <SpeakerCard
              key={speaker.slug}
              speaker={speaker}
              priority={index < 3}
              variant="cinematic"
            />
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
