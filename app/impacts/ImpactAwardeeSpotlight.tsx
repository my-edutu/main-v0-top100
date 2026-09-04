"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { AvatarSVG } from "@/lib/avatars"
import type { Awardee } from "@/lib/awardees"

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

export default function ImpactAwardeeSpotlight({ awardees }: { awardees: Awardee[] }) {
  const [orderedAwardees, setOrderedAwardees] = useState(awardees)

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

  if (orderedAwardees.length === 0) {
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
    <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-6">
      {orderedAwardees.map((awardee, index) => (
        <Link
          key={awardee.slug}
          href={`/awardees/${awardee.slug}`}
          className="group rounded-[1.75rem] border border-orange-100 bg-[#fff] p-5 shadow-[0_12px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-4 motion-reduce:transform-none motion-reduce:transition-none"
        >
          <article className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-100 text-slate-950 ring-4 ring-orange-50">
                {awardee.avatar_url ? (
                  <Image
                    src={awardee.avatar_url}
                    alt={`Portrait of ${awardee.name}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                ) : (
                  <AvatarSVG name={awardee.name} size={80} />
                )}
              </div>
              <span className="font-mono text-xs text-slate-400">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <h3 className="mt-5 text-xl font-semibold leading-7 transition group-hover:text-orange-700">
              {awardee.name}
            </h3>
            {awardee.country ? (
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-700">
                {awardee.country}
              </p>
            ) : null}
            <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">
              {awardee.bio ?? "Profile details coming soon."}
            </p>
            <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-slate-950">
              Meet {awardee.name.split(" ")[0]}
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
              />
            </span>
          </article>
        </Link>
      ))}
    </div>
  )
}
