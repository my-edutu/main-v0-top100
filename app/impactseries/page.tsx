import type { Metadata } from "next"

import ImpactSeriesSection from "@/app/components/ImpactSeriesSection"
import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"
import { SITE_URL } from "@/lib/site"

const impactSeriesCard = pageOg("/impactseries")

export const metadata: Metadata = {
  title: impactSeriesCard.title,
  description: impactSeriesCard.subtitle,
  alternates: { canonical: `${SITE_URL}/impactseries` },
  ...ogMetadata(impactSeriesCard, { url: "/impactseries" }),
}

export default function ImpactSeriesPage() {
  return (
    <main className="min-h-screen bg-[#0b1220]">
      <section className="relative overflow-hidden bg-[#0b1220] px-4 pb-14 pt-14 text-white sm:pb-20 sm:pt-24">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="container relative mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">Top100 Impact Series</p>
        <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-semibold tracking-tight !text-white sm:text-6xl">
          Interviews with leaders making impact.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
          Hear directly from Top100 awardees about the choices, challenges, and ideas shaping their work across Africa.
        </p>
        </div>
      </section>
      <div id="interviews"><ImpactSeriesSection stacked /></div>
    </main>
  )
}
