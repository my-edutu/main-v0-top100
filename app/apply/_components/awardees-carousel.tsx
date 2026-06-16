"use client"

import Image from "next/image"
import Link from "next/link"

import type { Awardee } from "@/lib/awardees-shared"

type AwardeesCarouselProps = {
  awardees: Awardee[]
}

const toProfileHref = (awardee: Awardee) => {
  const fallbackSlug = awardee.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")

  return `/awardees/${awardee.slug || fallbackSlug}`
}

const getTagline = (awardee: Awardee) =>
  awardee.tagline ||
  awardee.headline ||
  awardee.field_of_study ||
  awardee.course ||
  "Africa Future Leader"

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

const AwardeeMiniCard = ({ awardee }: { awardee: Awardee }) => {
  const imageUrl = awardee.cover_image_url || awardee.avatar_url
  const initials = getInitials(awardee.name)

  return (
    <Link
      href={toProfileHref(awardee)}
      className="group block w-[128px] shrink-0 sm:w-[148px] lg:w-[168px]"
      aria-label={`View ${awardee.name}'s profile`}
    >
      <article className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#020617] transition duration-300 hover:z-20 hover:scale-[1.04]">
        <div className="absolute inset-0 bg-[#020617]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={awardee.name}
              fill
              sizes="(max-width: 640px) 128px, (max-width: 1024px) 148px, 168px"
              className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.62),transparent_45%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]">
              <span className="rounded-full border border-white/15 bg-white/8 px-3 py-2 text-sm font-semibold tracking-[0.18em] text-white/85 backdrop-blur">
                {initials}
              </span>
            </div>
          )}
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0),rgba(2,6,23,0.9))]" />

        <div className="absolute inset-x-0 bottom-0 space-y-1 p-3 text-[#fff]">
          <h3 className="line-clamp-2 text-sm font-semibold leading-tight">
            {awardee.name}
          </h3>
          <p className="line-clamp-1 text-xs text-[#ffffff]/70">{getTagline(awardee)}</p>
          <p className="line-clamp-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#ffffff]/55">
            {awardee.country || "Across Africa"}
          </p>
        </div>
      </article>
    </Link>
  )
}

export default function AwardeesCarousel({ awardees }: AwardeesCarouselProps) {
  const visibleAwardees = awardees
    .filter((awardee) => awardee.name && (awardee.slug || awardee.awardee_id))
    .slice(0, 24)

  if (visibleAwardees.length === 0) {
    return null
  }

  const rows = [
    visibleAwardees.slice(0, 8),
    visibleAwardees.slice(8, 16),
    visibleAwardees.slice(16, 24),
  ].filter((row) => row.length > 0)

  return (
    <section className="overflow-hidden bg-[linear-gradient(180deg,#0b1220_0%,#111827_100%)] py-12 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-white sm:text-3xl">Meet our awardees</h2>
      </div>

      <div className="mt-8 space-y-3 sm:mt-10">

        {rows.map((row, index) => {
          const loop = [...row, ...row]
          const reverse = index % 2 === 1

          return (
            <div
              key={`awardee-row-${index}`}
              className={[
                "flex w-max gap-3 will-change-transform sm:gap-4",
                reverse ? "animate-awardee-marquee-reverse" : "animate-awardee-marquee",
                index === 2 ? "hidden md:flex" : "",
              ].join(" ")}
            >
              {loop.map((awardee, itemIndex) => (
                <AwardeeMiniCard
                  key={`${awardee.slug || awardee.awardee_id}-${index}-${itemIndex}`}
                  awardee={awardee}
                />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}
