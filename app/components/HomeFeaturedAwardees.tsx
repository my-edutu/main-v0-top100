"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AvatarSVG } from "@/lib/avatars"

type SpotlightAwardee = {
  slug: string
  name: string
  country?: string | null
  avatar_url?: string | null
}

type Props = {
  awardees: SpotlightAwardee[]
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

export default function HomeFeaturedAwardees({ awardees }: Props) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const safeAwardees = useMemo(
    () =>
      awardees.map((entry) => ({
        ...entry,
        slug: entry.slug && entry.slug.trim().length > 0 ? entry.slug : toSlug(entry.name),
      })),
    [awardees],
  )

  return (
    <section id="awardees" className="bg-slate-950 py-16 text-slate-50 sm:py-20 lg:py-24">
      <div className="container space-y-8">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">Awardee spotlight</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
            Meet the bold minds shaping Africa tomorrow
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Discover the people turning distinction into useful work, stronger communities, and lasting change.
          </p>
        </div>

        <div className="relative min-h-[220px]">
          {safeAwardees.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-6 text-center text-sm text-slate-300">
              Spotlight awardees will appear here once they are marked as featured in Supabase.
            </div>
          ) : (
            <div
              aria-label="Featured awardees"
              data-awardee-rail="featured"
              className="-mx-4 grid auto-cols-[8rem] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 [scrollbar-width:none] snap-x snap-proximity touch-pan-x sm:-mx-6 sm:auto-cols-[9.5rem] sm:gap-4 sm:px-6 lg:auto-cols-[11rem] [&::-webkit-scrollbar]:hidden"
            >
              {safeAwardees.map((awardee, index) => (
                <Link
                  key={awardee.slug}
                  href={`/awardees/${awardee.slug}`}
                  aria-label={`View ${awardee.name}'s awardee profile`}
                  className="group relative aspect-[2/3] min-w-0 snap-start overflow-hidden rounded-xl bg-slate-800 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:ring-orange-400/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 motion-reduce:transform-none"
                >
                  <div className="absolute inset-0 bg-slate-800">
                    {awardee.avatar_url && !imageErrors.has(awardee.slug) ? (
                      <Image
                        src={awardee.avatar_url}
                        alt={awardee.name}
                        fill
                        sizes="(max-width: 640px) 128px, (max-width: 1024px) 152px, 176px"
                        className="object-cover transition duration-500 group-hover:scale-105 motion-reduce:transform-none"
                        priority={index < 3}
                        onError={() => setImageErrors((previous) => new Set(previous).add(awardee.slug))}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-700/70 via-slate-800 to-slate-950 text-orange-200">
                        <AvatarSVG name={awardee.name} size={42} />
                      </div>
                    )}
                  </div>
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/15 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                    <h3 className="text-sm font-semibold leading-tight text-slate-50 sm:text-base">{awardee.name}</h3>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-300">
                      {awardee.country ?? "Across Africa"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-start">
          <Link
            href="/awardees"
            className="inline-flex items-center gap-3 rounded-full bg-orange-700 px-6 py-3.5 font-semibold text-slate-50 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            View all awardees
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
