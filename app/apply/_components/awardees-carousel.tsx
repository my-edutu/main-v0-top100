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

const portraitImages = [
  "/young-african-woman-technology-leader-smiling.jpg",
  "/young-african-man-telemedicine-innovator.jpg",
  "/young-african-man-business-leader.jpg",
  "/young-african-man-environmental-activist.jpg",
  "/young-african-man-healthcare-innovator.jpg",
  "/young-african-woman-fintech-entrepreneur.jpg",
  "/young-african-woman-education-leader.jpg",
  "/young-african-woman-social-entrepreneur.jpg",
]

const getPortraitFallback = (awardee: Awardee) => {
  const seed = awardee.name
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0)

  return portraitImages[seed % portraitImages.length]
}

const AwardeeMiniCard = ({ awardee }: { awardee: Awardee }) => {
  const imageUrl = awardee.cover_image_url || awardee.avatar_url || getPortraitFallback(awardee)

  return (
    <Link
      href={toProfileHref(awardee)}
      className="group block w-[128px] shrink-0 sm:w-[148px] lg:w-[168px]"
      aria-label={`View ${awardee.name}'s profile`}
    >
      <article className="relative aspect-[2/3] overflow-hidden rounded-xl bg-[#151515] transition duration-300 hover:z-20 hover:scale-[1.04]">
        <div className="absolute inset-0 bg-[#151515]">
          <Image
            src={imageUrl}
            alt={awardee.name}
            fill
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 148px, 168px"
            className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
          />
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />

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
    .slice(0, 30)

  if (visibleAwardees.length === 0) {
    return null
  }

  const rows = [
    visibleAwardees.slice(0, 8),
    visibleAwardees.slice(8, 16),
    visibleAwardees.slice(16, 24),
  ].filter((row) => row.length > 0)

  return (
    <section className="overflow-hidden bg-[#f7f3ec] py-12 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-slate-950 sm:text-3xl">Meet our awardees</h2>
      </div>

      <div className="mt-8 space-y-3 sm:mt-10">

        {rows.map((row, index) => {
          const loop = [...row, ...row, ...row, ...row]
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
