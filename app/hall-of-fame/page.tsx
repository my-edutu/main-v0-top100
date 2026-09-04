import type { Metadata } from "next"

import SpeakerCard from "@/app/components/SpeakerCard"
import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"
import { SITE_URL } from "@/lib/site"
import { SPEAKERS } from "@/lib/speakers"

export const metadata: Metadata = {
  title: "Hall of Fame",
  description: "Meet the speakers who have inspired and supported the Top100 community.",
  alternates: { canonical: `${SITE_URL}/hall-of-fame` },
  ...ogMetadata(pageOg("/hall-of-fame"), { url: "/hall-of-fame" }),
}

export default function HallOfFamePage() {
  return (
    <main className="bg-[#fffaf2] text-slate-950">
      <section className="container py-14 sm:py-20 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">
            Our Hall of Fame
          </p>
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
            Leaders who chose impact
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Meet the speakers who have shared their experience, challenged our community, and
            helped Africa’s future leaders see what is possible.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:mt-16 lg:grid-cols-4 lg:gap-7">
          {SPEAKERS.map((speaker, index) => (
            <SpeakerCard key={speaker.slug} speaker={speaker} priority={index < 4} />
          ))}
        </div>
      </section>
    </main>
  )
}
