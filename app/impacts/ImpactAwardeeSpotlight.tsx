"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import type { Awardee } from "@/lib/awardees"

type SpotlightAwardee = Pick<Awardee, "slug" | "name" | "country" | "bio"> & { avatar_url: string }

const SHUFFLE_INTERVAL_MS = 18_000

export function shuffleSpotlightAwardees<T>(
  awardees: readonly T[],
  random: () => number = Math.random,
): T[] {
  if (awardees.length < 2) return [...awardees]

  const shuffled = [...awardees]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    const boundedIndex = Math.max(0, Math.min(index, randomIndex))
    ;[shuffled[index], shuffled[boundedIndex]] = [shuffled[boundedIndex], shuffled[index]]
  }

  if (shuffled.every((awardee, index) => awardee === awardees[index])) {
    return [...shuffled.slice(1), shuffled[0]]
  }

  return shuffled
}

export default function ImpactAwardeeSpotlight({ awardees }: { awardees: SpotlightAwardee[] }) {
  const [orderedAwardees, setOrderedAwardees] = useState(awardees)
  const [failedPortraits, setFailedPortraits] = useState<string[]>([])
  const visibleAwardees = orderedAwardees.filter(({ avatar_url }) => !failedPortraits.includes(avatar_url))

  useEffect(() => {
    setOrderedAwardees(awardees)
  }, [awardees])

  useEffect(() => {
    if (awardees.length < 2) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let interval: ReturnType<typeof setInterval> | undefined

    const syncShuffle = () => {
      if (interval) clearInterval(interval)
      interval = undefined

      if (document.visibilityState === "visible" && !reducedMotion.matches) {
        interval = setInterval(() => {
          setOrderedAwardees((current) => shuffleSpotlightAwardees(current))
        }, SHUFFLE_INTERVAL_MS)
      }
    }

    syncShuffle()
    document.addEventListener("visibilitychange", syncShuffle)
    reducedMotion.addEventListener("change", syncShuffle)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener("visibilitychange", syncShuffle)
      reducedMotion.removeEventListener("change", syncShuffle)
    }
  }, [awardees.length])

  if (visibleAwardees.length === 0) {
    return (
      <div className="mt-10 rounded-[1.75rem] border border-dashed border-orange-200 bg-[#fff] p-8 text-center sm:p-10">
        <h3 className="text-xl font-semibold">Awardee spotlights are currently unavailable.</h3>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
          Explore the full directory while new spotlight profiles are prepared.
        </p>
        <Link
          href="/awardees"
          className="mt-5 inline-flex items-center gap-2 font-semibold text-orange-700 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-4"
        >
          Meet all awardees <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div role="region" aria-label="Awardee profiles" className="mt-6 flex snap-x snap-proximity gap-3 overflow-x-auto pb-3 sm:mt-10 sm:gap-4 lg:mt-14 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
      {visibleAwardees.map((awardee) => (
        <Link
          key={awardee.slug}
          href={`/awardees/${awardee.slug}`}
          className="group w-[86%] min-w-0 shrink-0 snap-start overflow-hidden rounded-2xl border border-orange-100 bg-[#fff] shadow-[0_12px_45px_rgba(15,23,42,0.06)] transition hover:border-orange-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-700 motion-reduce:transition-none sm:w-[46%] sm:rounded-[1.75rem] lg:w-auto motion-safe:lg:hover:-translate-y-1"
        >
          <article className="grid h-full grid-cols-[2fr_3fr]">
            <div className="relative min-h-40 overflow-hidden bg-orange-50">
              {/* Keep the original public portrait URL and remove the card if it becomes unavailable. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={awardee.avatar_url} alt={`Portrait of ${awardee.name}`} width={160} height={200} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[center_30%]" onError={() => setFailedPortraits((sources) => [...sources, awardee.avatar_url])} />
            </div>
            <div className="flex min-w-0 flex-col p-3 sm:p-4">
              <h3 className="break-words text-sm font-semibold leading-tight transition group-hover:text-orange-700 sm:text-lg">
                {awardee.name}
              </h3>
              {awardee.country ? (
                <p className="mt-1 break-words text-[10px] font-bold uppercase tracking-wide text-orange-700 sm:text-xs sm:tracking-[0.18em]">
                  {awardee.country}
                </p>
              ) : null}
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600 sm:text-sm">
                {awardee.bio ?? "Profile details coming soon."}
              </p>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-xs font-semibold text-slate-950 sm:text-sm">
                Meet {awardee.name.split(" ")[0]}
                <ArrowRight
                  aria-hidden="true"
                  className="size-3.5 shrink-0 transition group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none sm:size-4"
                />
              </span>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}
