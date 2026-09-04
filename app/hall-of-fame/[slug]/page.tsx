import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import PortraitImage from "@/app/components/PortraitImage"
import { ogMetadata } from "@/lib/og"
import { SITE_URL } from "@/lib/site"
import { SPEAKERS, getSpeaker } from "@/lib/speakers"

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return SPEAKERS.map(({ slug }) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const speaker = getSpeaker(slug)

  if (!speaker) return {}

  return {
    title: `${speaker.name} | Hall of Fame`,
    description: `${speaker.name}, a ${speaker.label}, in the Top100 Africa Future Leaders Hall of Fame.`,
    alternates: { canonical: `${SITE_URL}/hall-of-fame/${speaker.slug}` },
    ...ogMetadata(
      {
        eyebrow: "Hall of Fame",
        title: speaker.name,
        subtitle: speaker.label,
        hero: speaker.portrait,
      },
      { url: `/hall-of-fame/${speaker.slug}` },
    ),
  }
}

export default async function SpeakerPage({ params }: PageProps) {
  const { slug } = await params
  const speaker = getSpeaker(slug)

  if (!speaker) notFound()

  return (
    <main className="bg-[#fffaf2] text-slate-950">
      <section className="container grid gap-10 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-slate-200">
          <PortraitImage
            src={speaker.portrait}
            name={speaker.name}
            priority
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover"
          />
        </div>
        <div className="self-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">
            Hall of Fame · {speaker.eventYears.join(", ")}
          </p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-6xl">{speaker.name}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{speaker.label}</p>
          {speaker.topic ? (
            <h2 className="mt-10 text-2xl font-semibold">“{speaker.topic}”</h2>
          ) : null}
          <div className="mt-10 max-w-2xl border-l-2 border-orange-700 pl-5 sm:pl-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">
              Impact
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              {speaker.impact ??
                "Part of the Top100 speaker community, sharing experience and perspective with Africa’s next generation of leaders."}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/hall-of-fame"
              className="rounded-full bg-slate-950 px-5 py-3 font-semibold text-[#fff] transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            >
              Back to Hall of Fame
            </Link>
            <Link
              href="/impacts"
              className="rounded-full border border-slate-300 px-5 py-3 font-semibold transition hover:border-orange-700 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"
            >
              Explore the impact
            </Link>
          </div>
        </div>
      </section>

      {speaker.bioArtwork || speaker.announcementArtwork ? (
        <section className="container pb-16 lg:pb-24">
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {speaker.bioArtwork ? (
              <figure>
                <Image
                  src={speaker.bioArtwork}
                  alt={`${speaker.name} 2025 speaker session artwork`}
                  width={540}
                  height={675}
                  className="mx-auto h-auto w-full max-w-xl rounded-[2rem]"
                />
                <figcaption className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Speaker session artwork
                </figcaption>
              </figure>
            ) : null}
            {speaker.announcementArtwork ? (
              <figure>
                <Image
                  src={speaker.announcementArtwork}
                  alt={`${speaker.name} 2025 speaker announcement`}
                  width={540}
                  height={675}
                  className="mx-auto h-auto w-full max-w-xl rounded-[2rem]"
                />
                <figcaption className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Speaker announcement
                </figcaption>
              </figure>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  )
}
