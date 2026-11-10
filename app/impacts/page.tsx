import type { Metadata } from "next"
import Image from "@/components/safe-image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import HallOfFamePreview from "@/app/components/HallOfFamePreview"
import BlogCover from "@/components/BlogCover"
import { IMPACT_HERO } from "@/lib/impact-content"
import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"
import { getFeaturedSpeakers } from "@/lib/speakers"
import { SITE_URL } from "@/lib/site"
import { resolveStoryCoverCandidates } from "@/lib/story-covers"

import { getImpactPageData } from "./data"
import ImpactAwardeeSpotlight from "./ImpactAwardeeSpotlight"
import ImpactEvidence from "./ImpactEvidence"
import ImpactBackgroundVideo from "@/app/components/ImpactBackgroundVideo"
import PhotoSlideshow from "@/app/components/PhotoSlideshow"
import ImpactSeriesSection from "@/app/components/ImpactSeriesSection"

export const revalidate = 300

const impactCard = pageOg("/impacts")

export const metadata: Metadata = {
  title: impactCard.title,
  description: impactCard.subtitle,
  alternates: { canonical: `${SITE_URL}/impacts` },
  ...ogMetadata(impactCard, { url: "/impacts" }),
}

const storySurfaces = [
  "border-[#f1e4bd] bg-[#fff8e5]",
  "border-[#dcebdd] bg-[#f1f8ef]",
  "border-[#f3dfd4] bg-[#fff2ea]",
] as const

export default async function ImpactPage() {
  const { featuredAwardees, stories, moments } = await getImpactPageData()

  return (
    <main className="overflow-hidden bg-[#fffaf2] text-slate-950">
      <section className="relative isolate overflow-hidden bg-[#0b1220] py-14 text-white sm:py-20">
        <ImpactBackgroundVideo />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,18,32,0.78)_0%,rgba(11,18,32,0.64)_50%,rgba(11,18,32,0.86)_100%)] md:bg-[linear-gradient(90deg,rgba(11,18,32,0.94)_0%,rgba(11,18,32,0.76)_48%,rgba(11,18,32,0.32)_100%)]" />
        <div className="container relative">
          <div className="max-w-3xl py-4 lg:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#ffb77e]">
              {impactCard.eyebrow}
            </p>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.04em] !text-white sm:text-6xl lg:text-7xl">
              {impactCard.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#e2e8f0] sm:text-lg sm:leading-8">
              {IMPACT_HERO.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#leaders"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-700 px-6 py-3 font-semibold text-[#fff] transition hover:bg-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-4"
              >
                Explore leaders <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ImpactEvidence />
      <ImpactSeriesSection light />

      <section aria-labelledby="paid-work-title" className="bg-[#fff] py-12 text-slate-950 sm:py-20">
        <div className="container grid items-center gap-7 md:grid-cols-2 lg:gap-14">
          <div>
            <h2 id="paid-work-title" className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              Find a job. Grow at work.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Top100 helps awardees find paid work and build new skills. They share job leads and learn from each other.
              We’re bringing in mentors to give advice. We’re also building a place where people who hire can see what awardees can do.
            </p>
            <Link
              href="/blog/from-skills-to-paid-work"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-800 underline underline-offset-4 hover:text-orange-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
            >
              Learn how Top100 helps people find work <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
            </Link>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-orange-50">
            <Image
              src="/impact-paid-work.webp"
              alt="Two young professionals and a mentor review work together at a shared desk"
              fill
              sizes="(max-width: 767px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      <div className="impact-hall [&.impact-hall>section]:!bg-[#0b1220]">
        <HallOfFamePreview speakers={getFeaturedSpeakers()} />
      </div>

      <section id="leaders" className="container scroll-mt-24 py-12 sm:py-24">
        <div className="grid gap-4 sm:gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">
              Awardee spotlight
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              The work has names and faces.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600 lg:justify-self-end sm:text-lg sm:leading-8">
            Across disciplines and borders, these leaders are building programmes, businesses,
            and ideas that move their communities forward.
          </p>
        </div>

        <ImpactAwardeeSpotlight awardees={featuredAwardees} />
      </section>

      <section className="border-y border-orange-100 bg-[#fff] py-16 sm:py-24">
        <div className="container">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">
                Field notes
              </p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                Stories from the movement.
              </h2>
            </div>
            <Link href="/blog" className="inline-flex items-center gap-2 font-semibold text-orange-700 hover:text-orange-800">
              Read all stories <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          {stories.length > 0 ? (
            <div className="mt-10 grid gap-7 lg:mt-14 lg:grid-cols-3">
              {stories.map((post, index) => {
                const coverCandidates = resolveStoryCoverCandidates(post, index)

                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className={`group block overflow-hidden rounded-[1.5rem] border transition hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-4 ${storySurfaces[index]}`}
                  >
                    <article>
                      <div className="relative aspect-[16/10] overflow-hidden bg-orange-100">
                        <BlogCover
                          imageUrl={coverCandidates[0]}
                          fallbackImageUrls={coverCandidates.slice(1)}
                          title={post.title}
                          alt={post.coverImageAlt ?? post.title}
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          className="h-full w-full transition duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-5 sm:p-6">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">
                          Story {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-3 text-balance text-xl font-semibold leading-7 transition group-hover:text-orange-700 sm:text-2xl">
                          {post.title}
                        </h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                          {post.excerpt}
                        </p>
                      </div>
                    </article>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="mt-10 rounded-[1.75rem] border border-dashed border-orange-200 bg-[#fffaf2] p-8 text-center sm:p-10">
              <h3 className="text-xl font-semibold">No impact stories are published yet.</h3>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Visit the full story archive for more updates from the movement.
              </p>
              <Link
                href="/blog"
                className="mt-5 inline-flex items-center gap-2 font-semibold text-orange-700 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-4"
              >
                Read all stories <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="event-moments-title" className="container py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-700">
            Event moments
          </p>
          <h2 id="event-moments-title" className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            A movement, witnessed together.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Gatherings become exchanges: a new introduction, a hard-won lesson, a commitment
            carried home.
          </p>
        </div>

        <PhotoSlideshow photos={moments} label="Event photos" className="mx-auto mt-8 max-w-4xl sm:mt-12" />
      </section>
    </main>
  )
}
