import Link from "next/link"

import type { Speaker } from "@/lib/speakers"

import PortraitImage from "./PortraitImage"

export default function SpeakerCard({
  speaker,
  priority = false,
  headingLevel = 3,
  variant = "directory",
}: {
  speaker: Speaker
  priority?: boolean
  headingLevel?: 2 | 3
  variant?: "directory" | "cinematic"
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3"

  if (variant === "cinematic") {
    return (
      <Link
        href={`/hall-of-fame/${speaker.slug}`}
        aria-label={`View ${speaker.name}’s Hall of Fame profile`}
        data-card-variant="cinematic"
        className="group block snap-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
      >
        <article className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-800 shadow-[0_18px_48px_rgba(0,0,0,0.38)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:scale-[1.025] group-hover:shadow-[0_24px_60px_rgba(0,0,0,0.5)] motion-reduce:transform-none motion-reduce:transition-none">
          <PortraitImage
            src={speaker.portrait}
            name={speaker.name}
            priority={priority}
            sizes="(max-width: 640px) 7.75rem, (max-width: 1024px) 9rem, 10rem"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.045] motion-reduce:transform-none motion-reduce:transition-none"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04)_28%,rgba(2,6,23,0.45)_57%,rgba(2,6,23,0.98)_100%)]"
          />
          <span className="absolute left-2.5 top-2.5 rounded-full border border-white/25 bg-slate-950/65 px-2 py-1 text-[0.5rem] font-bold uppercase tracking-[0.14em] text-[#fff] backdrop-blur-sm sm:left-3 sm:top-3 sm:text-[0.55rem]">
            Speaker · {speaker.eventYears.join(", ")}
          </span>
          <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
            <Heading className="line-clamp-2 text-sm font-semibold leading-tight text-[#fff] sm:text-base">
              {speaker.name}
            </Heading>
            <p className="mt-1 hidden text-[0.625rem] leading-4 text-slate-300 sm:line-clamp-2">
              {speaker.label}
            </p>
            <span
              aria-hidden="true"
              className="mt-2 block h-0.5 w-6 bg-orange-700 transition-all duration-300 group-hover:w-10 motion-reduce:transition-none sm:mt-2.5"
            />
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link
      href={`/hall-of-fame/${speaker.slug}`}
      className="group block snap-start rounded-[1.65rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-4"
    >
      <article className="h-full rounded-[1.65rem] bg-[#fffaf2] p-3 pb-5 shadow-[0_18px_50px_rgba(15,23,42,0.12)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_60px_rgba(15,23,42,0.2)]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.4rem] bg-slate-200">
          <PortraitImage
            src={speaker.portrait}
            name={speaker.name}
            priority={priority}
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
          />
          <span className="absolute bottom-4 left-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#fff]">
            Speaker · {speaker.eventYears.join(", ")}
          </span>
        </div>
        <Heading className="mt-4 text-xl font-semibold text-slate-950">{speaker.name}</Heading>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{speaker.label}</p>
      </article>
    </Link>
  )
}
