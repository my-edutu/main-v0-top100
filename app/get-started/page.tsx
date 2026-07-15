import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { applicationEntryCards, type ApplicationProgram } from '@/lib/applications'

export const metadata: Metadata = {
  title: 'Apply for Top100 Africa Future Leaders 2026',
  description:
    'Explore the 2026 application, review flow, and entry routes for the Top100 Africa Future Leaders programme.',
}

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fcf9f4]'

const heroStats = [
  { value: '31', label: 'Countries in the network' },
  { value: '04', label: 'Ways to enter' },
  { value: '2026', label: 'Cohort now open' },
]

// Routes collected off-site (the awardee Google Form) open in a new tab; in-app
// routes stay client-side. Keeps every entry point pointing at one destination.
const routeLinkProps = (program: ApplicationProgram) =>
  program.externalFormUrl
    ? { href: program.externalFormUrl, target: '_blank' as const, rel: 'noopener noreferrer' }
    : { href: program.href }

const reviewSteps = [
  {
    title: 'Complete the form',
    description: 'Pick your route and finish the application in one sitting — profile, story, and contact details.',
  },
  {
    title: 'Team review',
    description: 'Every submission lands in the Top100 review queue and is checked for fit, context, and completeness.',
  },
  {
    title: 'Hear back',
    description: 'Approved applicants get onboarding and member access. Partners get a direct reply, not a form receipt.',
  },
]

export default function GetStartedPage() {
  const [featured, ...otherRoutes] = applicationEntryCards

  return (
    <div className="min-h-dvh bg-[#fcf9f4] bg-[radial-gradient(70rem_32rem_at_85%_-6rem,rgba(249,115,22,0.10),transparent)]">
      <div className="container pb-20 pt-10 sm:pb-28 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <p className="inline-flex items-center gap-2.5 text-sm font-semibold text-orange-800">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-600" />
                </span>
                2026 applications are open
              </p>
              <h1 className="mt-6 max-w-xl text-balance text-[2.6rem] font-bold leading-[1.05] tracking-[-0.02em] text-slate-950 sm:text-6xl">
                Start your Top100 application.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
                Four routes into a network of young leaders across 31 countries — the awardee cohort, ambassadorship,
                partnership, and volunteering. Every application is reviewed by a real team.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <Button
                  asChild
                  className="rounded-full bg-orange-600 px-7 text-white shadow-lg shadow-orange-600/25 hover:bg-orange-700 hover:shadow-orange-700/25"
                >
                  <a {...routeLinkProps(featured)}>
                    Apply as an awardee
                    <ArrowUpRight className="h-4 w-4" />
                  </a>
                </Button>
                <Link
                  href="/partnership"
                  className={`group inline-flex items-center gap-1.5 rounded-md text-base font-semibold text-slate-900 underline decoration-orange-300 underline-offset-4 transition-colors hover:text-orange-700 ${focusRing}`}
                >
                  Partner with us
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>

              <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-orange-900/10 pt-7">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse">
                    <dt className="mt-1.5 text-[13px] leading-5 text-slate-500">{stat.label}</dt>
                    <dd className="text-3xl font-bold tabular-nums tracking-tight text-slate-950">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative lg:pl-4">
              <div className="relative overflow-hidden rounded-[2rem] border border-orange-900/10 shadow-[0_32px_80px_-36px_rgba(124,45,18,0.4)]">
                <Image
                  src="/african-students-celebrating-achievement-at-gradua.jpg"
                  alt="Top100 awardees celebrating at a graduation ceremony"
                  width={1040}
                  height={780}
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orange-950/40 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-7 -left-3 hidden max-w-[17rem] rounded-2xl border border-orange-100 bg-white p-5 shadow-xl shadow-orange-900/10 md:block lg:-left-8">
                <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-950">10,000 by 2030</p>
                <p className="mt-1.5 text-[13px] leading-5 text-slate-600">
                  The goal behind the network: ten thousand celebrated young leaders across Africa.
                </p>
              </div>
            </div>
          </section>

          {/* Routes */}
          <section className="mt-20 sm:mt-28" aria-labelledby="routes-heading">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-orange-700">Application routes</p>
              <h2
                id="routes-heading"
                className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
              >
                Four ways in. Pick yours.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Most people apply for the awardee cohort — but the network also runs on ambassadors, partners, and
                volunteers.
              </p>
            </div>

            <a
              {...routeLinkProps(featured)}
              className={`group mt-10 grid overflow-hidden rounded-[2rem] border border-orange-900/10 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-orange-900/10 lg:grid-cols-[1.1fr_1fr] ${focusRing}`}
            >
              <div className="flex flex-col p-7 sm:p-10 lg:p-12">
                <p className="text-sm font-semibold text-orange-700">Route 01 · {featured.badge}</p>
                <h3 className="mt-4 max-w-md text-balance text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {featured.title}
                </h3>
                <p className="mt-3 max-w-lg text-base leading-7 text-slate-600">{featured.summary}</p>
                <ul className="mt-7 space-y-3">
                  {featured.highlights.map((highlight) => (
                    <li key={highlight.title} className="flex gap-3 text-sm leading-6 text-slate-600">
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center">
                        <Check className="h-4 w-4 text-orange-600" strokeWidth={2.5} />
                      </span>
                      <span>
                        <span className="font-semibold text-slate-900">{highlight.title}.</span> {highlight.description}
                      </span>
                    </li>
                  ))}
                </ul>
                <span className="mt-8 inline-flex items-center gap-2 text-base font-semibold text-orange-700 lg:mt-auto lg:pt-8">
                  Apply as an awardee
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
              <div className="relative order-first min-h-[16rem] lg:order-none lg:min-h-full">
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  style={{ objectPosition: featured.imagePosition }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orange-950/30 via-transparent to-transparent" />
                <span className="absolute left-5 top-5 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-orange-800 shadow-sm">
                  Most applicants start here
                </span>
              </div>
            </a>

            <div className="mt-6 overflow-hidden rounded-[2rem] border border-orange-900/10 bg-white">
              <ul className="divide-y divide-orange-900/[0.07]">
                {otherRoutes.map((program, index) => (
                  <li key={program.type}>
                    <Link
                      href={program.href}
                      className={`group grid gap-x-6 gap-y-3 p-6 transition-colors duration-200 hover:bg-orange-50/60 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:p-7 lg:px-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500/60`}
                    >
                      <span className="text-sm font-semibold tabular-nums text-orange-700/50">
                        0{index + 2}
                      </span>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-slate-950">{program.badge}</h3>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{program.summary}</p>
                        <p className="mt-2 text-[13px] font-medium text-slate-500">{program.showcase.join(' · ')}</p>
                      </div>
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-orange-900/10 text-orange-700 transition-colors duration-200 group-hover:border-orange-600 group-hover:bg-orange-600 group-hover:text-white">
                        <ArrowRight className="h-4 w-4" />
                        <span className="sr-only">Open the {program.badge} application</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* What happens next */}
          <section className="mt-20 border-t border-orange-900/10 pt-12 sm:mt-24 sm:pt-14" aria-labelledby="steps-heading">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_2fr] lg:gap-16">
              <div>
                <h2 id="steps-heading" className="text-balance text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  What happens after you submit
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  No black box. Each route follows the same three-step review.
                </p>
              </div>
              <ol className="grid gap-8 sm:grid-cols-3">
                {reviewSteps.map((step, index) => (
                  <li key={step.title}>
                    <p className="text-sm font-semibold tabular-nums text-orange-700">Step {index + 1}</p>
                    <h3 className="mt-2 text-base font-bold tracking-tight text-slate-950">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
