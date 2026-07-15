import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Globe2,
  HeartHandshake,
  MapPin,
  Mic,
  PartyPopper,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Africa Future Leaders Summit 2026 | AFL 2026",
  description:
    "AFL 2026 — the Africa Future Leaders Summit. Apply for the 2026 cohort, become a speaker, partner with us, and celebrate at the Africa Future Leaders Festival.",
  openGraph: {
    title: "Africa Future Leaders Summit 2026 | AFL 2026",
    description:
      "Apply for the 2026 cohort, become a speaker, partner with us, and celebrate at the Africa Future Leaders Festival.",
    images: ["/african-students-celebrating-achievement-at-gradua.jpg"],
  },
}

// Speaker and partner enquiries route to the partnerships inbox.
const SPEAKER_CONTACT_URL =
  "mailto:partnership@top100afl.com?subject=Speaker%20application%20—%20Africa%20Future%20Leaders%20Summit%202026"

// The three ways to take part right now. Volunteering gets its own section
// below because it is not yet open.
const pathways = [
  {
    title: "Apply for Africa Future Leaders",
    description:
      "The awardee route for first-class graduates and emerging leaders already building measurable impact. Join the 2026 cohort and take your seat at the summit.",
    cta: "Start your application",
    href: "/apply",
    external: false,
    icon: Sparkles,
    featured: true,
  },
  {
    title: "Become a Speaker",
    description:
      "Keynotes, panels, and masterclasses across leadership, technology, education, climate, and funding. Tell us the story only you can tell.",
    cta: "Pitch your session",
    href: SPEAKER_CONTACT_URL,
    external: true,
    icon: Mic,
    featured: false,
  },
  {
    title: "Partner with Us",
    description:
      "Sponsorship, co-created labs, opportunity pipelines, or platform support — bring your organisation alongside a network spanning 31 countries.",
    cta: "Explore partnership",
    href: "/partnership",
    external: false,
    icon: HeartHandshake,
    featured: false,
  },
]

const benefits = [
  {
    title: "Recognition on a continental stage",
    description:
      "Awardees are celebrated before partners, press, and peers — with a feature in the Africa Future Leaders magazine.",
  },
  {
    title: "Learning tracks with global voices",
    description:
      "Immersive sessions led by policy shapers, founders, and faculty unpack the skills powering next-decade leadership.",
  },
  {
    title: "A network that outlasts the event",
    description:
      "Facilitated lounges and mixers connect you with awardees, alumni, mentors, and ecosystem builders across the continent.",
  },
  {
    title: "Doors to real opportunities",
    description:
      "Scholarship and fellowship guidance, partner roundtables, and deal-flow conversations that match ideas with backing.",
  },
]

// Moments from previous gatherings.
const summitGallery = ["/IMG_0676.jpg", "/IMG_0681.jpg", "/IMG_0685.jpg"]

export default function Afl2026Page() {
  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fffaf4_46%,#f7f3ec_100%)]">
      {/* ============================ HERO ============================ */}
      <section className="px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <div className="container">
          <div className="relative mx-auto overflow-hidden rounded-[32px] bg-[#05060f]">
            {/* Warm light-fan backdrop — orange leads for AFL 2026 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "conic-gradient(from 200deg at 50% 118%, transparent 0deg, rgba(249,115,22,0.32) 20deg, transparent 34deg, rgba(245,158,11,0.3) 48deg, transparent 62deg, rgba(249,115,22,0.26) 76deg, transparent 92deg, rgba(251,146,60,0.28) 108deg, transparent 124deg, rgba(245,158,11,0.24) 140deg, transparent 162deg)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 90% at 50% 120%, rgba(249,115,22,0.3) 0%, rgba(5,6,15,0) 55%), radial-gradient(90% 70% at 50% -10%, rgba(15,23,42,0.6) 0%, rgba(5,6,15,0) 60%)",
              }}
            />

            <div className="relative z-10 flex min-h-[460px] flex-col items-center justify-center px-6 py-16 text-center sm:min-h-[520px] sm:px-8 lg:min-h-[580px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.42em] text-[rgba(255,255,255,0.6)]">
                AFL 2026
              </p>
              <h1 className="mt-6 max-w-4xl text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-tight text-[#fff] drop-shadow-[0_2px_20px_rgba(0,0,0,0.4)] sm:text-6xl lg:text-7xl">
                Africa Future Leaders Summit 2026.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[rgba(255,255,255,0.72)] sm:text-lg">
                Two days where the continent&apos;s boldest young leaders, partners, and
                mentors meet — capped by the Africa Future Leaders Festival.
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 text-sm text-[rgba(255,255,255,0.78)]">
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] px-4 py-1.5">
                  <CalendarDays className="h-4 w-4 text-orange-300" aria-hidden />
                  Dates announced soon
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] px-4 py-1.5">
                  <MapPin className="h-4 w-4 text-orange-300" aria-hidden />
                  In person + virtual
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)] px-4 py-1.5">
                  <Globe2 className="h-4 w-4 text-orange-300" aria-hidden />
                  31 countries represented
                </span>
              </div>

              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-base text-[#fff] shadow-none hover:opacity-95"
                >
                  <Link href="/apply">
                    Apply for Africa Future Leaders
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-full border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.05)] px-8 text-base text-[#fff] hover:bg-[rgba(255,255,255,0.1)] hover:text-[#fff]"
                >
                  <a href={SPEAKER_CONTACT_URL}>Become a speaker</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================== WAYS TO TAKE PART ====================== */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container space-y-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Three ways into AFL 2026.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Whether you&apos;re applying for the cohort, taking the stage, or backing the
              movement — there&apos;s a route for you.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {pathways.map((pathway) => {
              const Icon = pathway.icon
              const inner = (
                <>
                  <div
                    className={
                      pathway.featured
                        ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.35)]"
                        : "flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50"
                    }
                  >
                    <Icon
                      className={
                        pathway.featured ? "h-6 w-6 text-slate-950" : "h-6 w-6 text-orange-600"
                      }
                      aria-hidden
                    />
                  </div>
                  <h3
                    className={
                      pathway.featured
                        ? "mt-5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl"
                        : "mt-5 text-xl font-semibold tracking-tight text-slate-950"
                    }
                  >
                    {pathway.title}
                  </h3>
                  <p
                    className={
                      pathway.featured
                        ? "mt-3 flex-1 text-base leading-8 text-slate-900"
                        : "mt-3 flex-1 text-sm leading-7 text-slate-600"
                    }
                  >
                    {pathway.description}
                  </p>
                  <span
                    className={
                      pathway.featured
                        ? "mt-6 inline-flex items-center gap-2 text-base font-semibold text-slate-950"
                        : "mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-700"
                    }
                  >
                    {pathway.cta}
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </>
              )

              const className = pathway.featured
                ? "group flex flex-col rounded-[28px] bg-gradient-to-br from-orange-400 to-amber-400 p-8 transition-transform duration-300 hover:-translate-y-1 lg:col-span-3 lg:row-span-2"
                : "group flex flex-col rounded-[28px] border border-orange-100 bg-white p-7 transition-transform duration-300 hover:-translate-y-1 lg:col-span-2"

              return pathway.external ? (
                <a key={pathway.title} href={pathway.href} className={className}>
                  {inner}
                </a>
              ) : (
                <Link key={pathway.title} href={pathway.href} className={className}>
                  {inner}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ========================== BENEFITS ========================== */}
      <section className="border-y border-orange-100 bg-[#faf6ef] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                What being in the room does for you.
              </h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
                Africa Future Leaders is more than an award — it&apos;s a platform. Here is
                what awardees and attendees walk away with.
              </p>

              <ul className="mt-8 space-y-6">
                {benefits.map((benefit) => (
                  <li key={benefit.title} className="flex gap-4">
                    <span
                      aria-hidden
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                    />
                    <div>
                      <h3 className="text-lg font-semibold tracking-tight text-slate-950">
                        {benefit.title}
                      </h3>
                      <p className="mt-1 text-sm leading-7 text-slate-600">
                        {benefit.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Staggered photo column from past gatherings */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] border border-orange-100 bg-slate-100">
                <Image
                  src={summitGallery[0]}
                  alt="Awardees connecting at a Top100 Africa Future Leaders gathering"
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-8 space-y-3 sm:space-y-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-orange-100 bg-slate-100">
                  <Image
                    src={summitGallery[1]}
                    alt="A speaker addressing the Africa Future Leaders audience"
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] border border-orange-100 bg-slate-100">
                  <Image
                    src={summitGallery[2]}
                    alt="Partners and awardees celebrating together at the summit"
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================== FESTIVAL ========================== */}
      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[28px] border border-orange-100 bg-slate-100 shadow-[0_30px_60px_-40px_rgba(249,115,22,0.45)]">
              <Image
                src="/IMG_0673.jpg"
                alt="Awardees and guests celebrating together at a Top100 Africa Future Leaders gathering"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>

            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-semibold text-orange-700">
                <PartyPopper className="h-4 w-4" aria-hidden />
                The grand finale
              </p>
              <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Africa Future Leaders Festival.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                The summit closes the way the continent celebrates — together. The Africa
                Future Leaders Festival brings music, culture, and community to the AFL 2026
                stage: the awardee celebration, project showcases, and an evening that turns
                a network into a family.
              </p>
              <p className="mt-4 max-w-xl text-base leading-8 text-slate-600">
                Every summit attendee is part of the festival — no separate ticket, no extra
                step. Come for the sessions, stay for the celebration.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  className="h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-7 text-sm font-semibold text-[#fff] shadow-none hover:opacity-95"
                >
                  <Link href="/apply">
                    Secure your place
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================== VOLUNTEER ========================== */}
      <section className="px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
        <div className="container">
          <div className="rounded-[28px] border border-dashed border-orange-200 bg-white/70 px-6 py-10 text-center sm:px-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-800">
              Not yet open
            </p>
            <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Volunteer for AFL 2026.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Volunteers power the summit — programme production, community hospitality, and
              media storytelling. Volunteer applications haven&apos;t opened yet; check back
              here once dates are announced.
            </p>
          </div>
        </div>
      </section>

      {/* ========================= BOTTOM CTA ========================= */}
      <section className="px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <div className="container">
          <div className="relative overflow-hidden rounded-[32px] bg-[#05060f] px-6 py-14 text-center sm:px-10 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(90% 120% at 50% -10%, rgba(249,115,22,0.28) 0%, rgba(5,6,15,0) 55%), radial-gradient(80% 120% at 50% 120%, rgba(245,158,11,0.24) 0%, rgba(5,6,15,0) 55%)",
              }}
            />
            <div className="relative z-10 mx-auto max-w-2xl">
              <h2 className="text-balance text-3xl font-semibold tracking-tight text-[#fff] sm:text-4xl lg:text-5xl">
                Be part of AFL 2026.
              </h2>
              <p className="mt-4 text-base leading-8 text-[rgba(255,255,255,0.72)] sm:text-lg">
                Apply for the cohort, take the stage, or bring your organisation alongside
                the movement. The 2026 chapter starts with you.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-8 text-base text-[#fff] shadow-none hover:opacity-95"
                >
                  <Link href="/apply">
                    Apply now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-full border-[rgba(255,255,255,0.25)] bg-[rgba(255,255,255,0.05)] px-8 text-base text-[#fff] hover:bg-[rgba(255,255,255,0.1)] hover:text-[#fff]"
                >
                  <Link href="/partnership">Partner with us</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
