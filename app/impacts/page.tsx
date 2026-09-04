import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import HallOfFamePreview from "@/app/components/HallOfFamePreview"
import { AvatarSVG } from "@/lib/avatars"
import { IMPACT_HERO, IMPACT_STATS } from "@/lib/impact-content"
import { ogMetadata } from "@/lib/og"
import { pageOg } from "@/lib/og-pages"
import { getFeaturedSpeakers } from "@/lib/speakers"
import { SITE_URL } from "@/lib/site"
import { resolveStoryCover } from "@/lib/story-covers"

import { getImpactPageData } from "./data"

export const revalidate = 300

const impactCard = pageOg("/impacts")

export const metadata: Metadata = {
  title: impactCard.title,
  description: impactCard.subtitle,
  alternates: { canonical: `${SITE_URL}/impacts` },
  ...ogMetadata(impactCard, { url: "/impacts" }),
}

const momentLayouts = [
  "sm:col-span-7 sm:row-span-2 sm:aspect-auto",
  "sm:col-span-5 sm:aspect-[4/3]",
  "sm:col-span-5 sm:aspect-[4/3]",
  "sm:col-span-4 sm:aspect-square",
  "sm:col-span-4 sm:aspect-square",
  "sm:col-span-4 sm:aspect-square",
] as const

export default async function ImpactPage() {
  const { featuredAwardees, stories, moments } = await getImpactPageData()

  return (
    <main className="overflow-hidden bg-[#fffaf2] text-slate-950">
      <section className="container py-8 sm:py-12 lg:py-16">
        <div className="grid items-stretch gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
          <div className="flex flex-col justify-center py-4 lg:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-orange-600">
              {impactCard.eyebrow}
            </p>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              {impactCard.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {IMPACT_HERO.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#leaders"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-semibold text-[#fff] transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4"
              >
                Explore leaders <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
              <Link
                href="/partnership"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-[#fff] px-6 py-3 font-semibold text-slate-950 transition hover:border-orange-500 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4"
              >
                Partner with us
              </Link>
            </div>
          </div>

          <figure className="relative min-h-[25rem] overflow-hidden rounded-[2rem] bg-slate-200 shadow-[0_28px_80px_rgba(15,23,42,0.18)] sm:min-h-[34rem] lg:min-h-[42rem]">
            <Image
              src={impactCard.hero ?? "/IMG_0679.jpg"}
              alt="Top100 Africa Future Leaders awardees gathered at an event"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,transparent_48%,rgba(11,18,32,0.82)_100%)]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 p-6 text-[#fff] sm:p-8">
              <span className="max-w-sm text-lg font-medium leading-6">
                Recognition marks a moment. The work carries forward.
              </span>
              <span className="hidden text-xs font-bold uppercase tracking-[0.24em] text-[rgba(255,255,255,0.72)] sm:block">
                Top100 community
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        aria-label="Impact at a glance"
        className="bg-[#0b1220] text-[#fff]"
      >
        <div className="container grid divide-y divide-[rgba(255,255,255,0.14)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {IMPACT_STATS.map((stat) => (
            <div key={stat.key} className="flex items-center gap-4 py-6 sm:px-7 sm:first:pl-0 sm:last:pr-0">
              <p className="shrink-0 text-3xl font-semibold tracking-tight sm:text-4xl">
                {stat.value.toLocaleString("en-US")}{stat.suffix}
              </p>
              <div>
                <p className="text-sm font-semibold text-[#fff]">{stat.label}</p>
                <p className="mt-0.5 text-xs text-[rgba(255,255,255,0.62)]">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="impact-hall [&.impact-hall>section]:!bg-[#0b1220] [&.impact-hall_.text-white]:!text-[#fff]">
        <HallOfFamePreview speakers={getFeaturedSpeakers()} />
      </div>

      <section id="leaders" className="container scroll-mt-24 py-16 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">
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

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-6">
          {featuredAwardees.map((awardee, index) => (
            <Link
              key={awardee.slug}
              href={`/awardees/${awardee.slug}`}
              className="group rounded-[1.75rem] border border-orange-100 bg-[#fff] p-5 shadow-[0_12px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4"
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
                  <span className="font-mono text-xs text-slate-400">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold leading-7 transition group-hover:text-orange-700">
                  {awardee.name}
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                  {awardee.country ?? "Africa"}
                </p>
                <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600">
                  {awardee.bio ?? awardee.tagline ?? "Building a legacy of leadership and community impact."}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-slate-950">
                  Meet {awardee.name.split(" ")[0]}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-orange-100 bg-[#fff] py-16 sm:py-24">
        <div className="container">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">
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

          <div className="mt-10 grid gap-7 lg:mt-14 lg:grid-cols-3">
            {stories.map((post, index) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4"
              >
                <article>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-orange-100">
                    <Image
                      src={resolveStoryCover(post, index)}
                      alt={post.coverImageAlt ?? post.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-orange-600">
                    Story {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-3 text-balance text-xl font-semibold leading-7 transition group-hover:text-orange-700 sm:text-2xl">
                    {post.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">
            Event moments
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
            A movement, witnessed together.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Gatherings become exchanges: a new introduction, a hard-won lesson, a commitment
            carried home.
          </p>
        </div>

        <div className="mt-10 grid auto-rows-[minmax(12rem,1fr)] grid-cols-1 gap-4 sm:grid-cols-12 lg:mt-14">
          {moments.map((moment, index) => (
            <figure
              key={moment.id}
              className={`group relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-slate-200 ${momentLayouts[index]}`}
            >
              <Image
                src={moment.src}
                alt={moment.alt}
                fill
                sizes={index === 0 ? "(max-width: 640px) 100vw, 58vw" : "(max-width: 640px) 100vw, 34vw"}
                className="object-cover transition duration-700 group-hover:scale-[1.025]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(11,18,32,0.78)_100%)]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 p-5 text-sm font-medium leading-5 text-[#fff] sm:p-6">
                {moment.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="container pb-8 sm:pb-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0b1220] px-6 py-12 text-[#fff] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[rgba(249,115,22,0.22)] blur-3xl"
          />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-400">Impact interviews</p>
            <h2 className="mt-4 text-3xl font-semibold text-[#fff] sm:text-5xl">Hear the work behind the recognition.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Awardees share the decisions, setbacks, and community work shaping their journeys.</p>
            <Link href="/interviews" className="mt-7 inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 font-semibold text-[#fff] transition hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b1220]">Watch the interviews <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="container py-16 sm:py-24">
        <div className="grid overflow-hidden rounded-[2rem] border border-orange-200 bg-[#fff] lg:grid-cols-2">
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">Build with us</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Help the work travel further.</h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-600">
              Bring resources, reach, and expertise to a community turning recognition into durable change.
            </p>
            <Link href="/partnership" className="mt-7 inline-flex items-center gap-2 font-semibold text-orange-700 hover:text-orange-800">
              Partner with us <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="border-t border-orange-200 bg-orange-50 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-600">The directory</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Meet the people moving Africa forward.</h2>
            <p className="mt-4 max-w-lg leading-7 text-slate-600">
              Explore the full network of recognised leaders, their fields, and the communities they serve.
            </p>
            <Link href="/awardees" className="mt-7 inline-flex items-center gap-2 font-semibold text-orange-700 hover:text-orange-800">
              Meet all awardees <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
