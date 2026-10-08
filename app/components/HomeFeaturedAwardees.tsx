"use client"

import { useMemo, useState } from "react"
import Image from "@/components/safe-image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { resolveSupabasePortrait } from "@/lib/media/remote-image-source"

type SpotlightAwardee = {
  slug: string
  name: string
  country?: string | null
  avatar_url?: string | null
  headline?: string | null
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
        avatar_url: resolveSupabasePortrait(entry.avatar_url),
        slug: entry.slug && entry.slug.trim().length > 0 ? entry.slug : toSlug(entry.name),
      })).filter((entry) => entry.avatar_url && !imageErrors.has(entry.slug)),
    [awardees, imageErrors],
  )

  const rows = useMemo(
    () => Array.from({ length: 3 }, (_, rowIndex) => safeAwardees.filter((_, index) => index % 3 === rowIndex)),
    [safeAwardees],
  )

  return (
    <section id="awardees" className="leader-spotlight-dark overflow-hidden bg-slate-950 py-12 text-slate-50 sm:py-16 lg:py-20">
      <div className="container space-y-7 sm:space-y-9">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">Africa Future Leaders · 2026</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Meet our 2026 Africa Future Leaders
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
            Meet the young leaders building a brighter future for communities across Africa.
          </p>
        </div>

        <div className="leader-marquee-stack space-y-2 sm:space-y-4" aria-label="2026 Africa Future Leaders">
          {safeAwardees.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.04] via-white/[0.02] to-orange-500/10 p-5 sm:p-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">2026 cohort</p>
              <h3 className="mt-2 text-lg font-semibold text-white sm:text-xl">Leader profiles are being added</h3>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                Check back soon to meet this year&apos;s Africa Future Leaders.
              </p>
            </div>
          ) : rows.map((row, rowIndex) => row.length > 0 && (
            <div
              key={rowIndex}
              className="leader-marquee"
              role="region"
              aria-label={`Leader row ${rowIndex + 1} of 3`}
            >
              <div
                className={`leader-marquee-track ${rowIndex % 2 === 1 ? "leader-marquee-track-reverse" : ""}`}
                style={{ animationDuration: `${360 + rowIndex * 60}s` }}
              >
                {[false, true].map((isDuplicate) => (
                  <div
                    key={isDuplicate ? "duplicate" : "leaders"}
                    className="leader-marquee-group"
                    aria-hidden={isDuplicate || undefined}
                  >
                    {row.map((awardee, index) => (
                      <Link
                        key={awardee.slug}
                        href={`/awardees/${encodeURIComponent(awardee.slug)}`}
                        aria-label={`View ${awardee.name}'s profile`}
                        tabIndex={isDuplicate ? -1 : undefined}
                        className="group relative block aspect-[4/5] w-[116px] shrink-0 overflow-hidden rounded-lg bg-slate-800 ring-1 ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:w-[158px] sm:rounded-2xl lg:w-[174px]"
                      >
                        <div className="absolute inset-0 bg-slate-800">
                          {awardee.avatar_url && !imageErrors.has(awardee.slug) ? (
                            <Image
                              src={awardee.avatar_url}
                              alt={`${awardee.name}, 2026 Africa Future Leader`}
                              fill
                              sizes="(max-width: 640px) 116px, (max-width: 1024px) 158px, 174px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                              loading={!isDuplicate && index < 4 ? "eager" : "lazy"}
                              fetchPriority={!isDuplicate && rowIndex === 0 && index < 2 ? "high" : "auto"}
                              quality={60}

                              onError={() => setImageErrors((previous) => new Set(previous).add(awardee.slug))}
                            />
                          ) : null}
                        </div>
                        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3.5">
                          <p className="mb-1 truncate text-[8px] font-bold uppercase tracking-[0.12em] text-orange-300 sm:mb-1.5 sm:text-[10px] sm:tracking-[0.15em]">
                            {awardee.country ?? "Africa"}
                          </p>
                          <h3 className="line-clamp-2 text-xs font-semibold leading-tight text-white sm:text-base">{awardee.name}</h3>
                          {awardee.headline && (
                            <p className="mt-1 line-clamp-1 text-[9px] leading-3 text-slate-200 sm:mt-1.5 sm:text-xs sm:leading-4">{awardee.headline}</p>
                          )}
                          <span className="mt-2 inline-flex items-center text-[9px] font-semibold text-white sm:mt-2.5 sm:text-xs">
                            View profile
                            <ArrowRight className="ml-1.5 size-3 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-start pt-1">
          <Link
            href="/awardees?year=2026"
            className="inline-flex items-center gap-3 rounded-full bg-orange-700 px-5 py-3 text-sm font-semibold text-slate-50 transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:px-6 sm:py-3.5 sm:text-base"
          >
            View all 2026 leaders
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
