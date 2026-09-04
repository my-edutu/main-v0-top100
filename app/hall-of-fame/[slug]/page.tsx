import type { Metadata } from "next"
import { notFound } from "next/navigation"

import PortraitImage from "@/app/components/PortraitImage"
import SpeakerMediaCarousel from "@/app/components/SpeakerMediaCarousel"
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
      <section className="container grid gap-10 py-12 sm:py-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16 lg:py-24">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-slate-200 lg:sticky lg:top-28 lg:self-start">
          <PortraitImage
            src={speaker.portrait}
            name={speaker.name}
            priority
            sizes="(max-width: 1024px) 100vw, 42vw"
            className="object-cover"
          />
        </div>
        <div className="self-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">Hall of Fame</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{speaker.name}</h1>
          <p className="mt-5 max-w-2xl text-xl leading-9 text-slate-600">{speaker.label}</p>
          <div className="mt-10 max-w-2xl border-t border-orange-200 pt-7">
            <h2 className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">Profile</h2>
            <p className="mt-4 text-lg leading-8 text-slate-700">{speaker.profile}</p>
          </div>
          {speaker.topic ? (
            <blockquote className="mt-10 max-w-2xl border-l-2 border-orange-700 pl-5 text-2xl font-semibold leading-tight sm:pl-6 sm:text-3xl">
              “{speaker.topic}”
            </blockquote>
          ) : null}
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white sm:py-20 lg:py-24">
        <div className="container grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-20">
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">The work behind the title</p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">Impact</h2>
            <p className="mt-5 text-base leading-8 text-slate-300">The work behind the title—the choices, systems, and communities that carry their leadership forward.</p>
          </div>
          <div className="max-w-3xl border-l border-orange-400/70 pl-6 sm:pl-8">
            <p className="text-lg leading-9 text-slate-100 sm:text-2xl sm:leading-10">
              {speaker.impact ??
                "Part of the Top100 speaker community, sharing experience and perspective with Africa’s next generation of leaders."}
            </p>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-20 lg:py-24">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">From the Top100 stage</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">A closer look at the journey.</h2>
        </div>
        <SpeakerMediaCarousel speaker={speaker} />
        <div className="mt-12 rounded-[1.75rem] bg-orange-100 px-6 py-8 sm:px-10 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-800">Watch the conversation</p>
          {speaker.youtubeUrl ? (
            <a
              href={speaker.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xl font-semibold text-slate-950 underline decoration-orange-700 decoration-2 underline-offset-4"
            >
              Open on YouTube <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="mt-4 text-xl font-semibold text-slate-950">Video coming soon</p>
          )}
        </div>
      </section>
    </main>
  )
}
