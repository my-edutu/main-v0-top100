import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { applicationEntryCards } from '@/lib/applications'

export const metadata: Metadata = {
  title: 'Apply for Top100 Africa Future Leaders 2026',
  description:
    'Explore the 2026 application, review flow, and entry routes for the Top100 Africa Future Leaders programme.',
}

export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_26%),linear-gradient(180deg,#fffaf4_0%,#ffffff_42%,#f7f3ec_100%)]">
      <section className="container px-4 py-8 sm:py-12 lg:py-14">
        <div className="mx-auto max-w-7xl space-y-10">
          <section className="relative overflow-hidden rounded-[34px] border border-orange-100 bg-white">
            <div className="absolute inset-0">
              <div className="pointer-events-none absolute -left-24 top-8 hidden h-56 w-56 rounded-full bg-orange-200/40 blur-3xl sm:block" />
              <div className="pointer-events-none absolute -right-20 bottom-2 hidden h-64 w-64 rounded-full bg-amber-200/35 blur-3xl sm:block" />
              <Image
                src="/african-students-celebrating-achievement-at-gradua.jpg"
                alt="Top100 Africa Future Leaders magazine cover"
                fill
                priority
                className="object-cover object-center opacity-65 mix-blend-multiply"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.82)_0%,rgba(255,255,255,0.76)_35%,rgba(247,241,232,0.9)_100%)]" />
            </div>

            <div className="relative flex min-h-[420px] items-center px-6 py-10 sm:px-10 sm:py-12 lg:min-h-[460px] lg:px-12 lg:py-14">
              <div className="mx-auto max-w-4xl space-y-6 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-orange-700">
                  2026 application open
                </p>
                <div className="space-y-4">
                  <h1 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.03] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                    The 2026 Top100 Africa Future Leaders application is now open.
                  </h1>
                  <p className="mx-auto max-w-2xl text-base leading-8 text-slate-700 sm:text-lg">
                    Apply to the awardee cohort, complete your BIO, and step into a network that spans 31 countries.
                    Partners can also join the movement with visibility, funding, and collaboration.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild className="h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-6 text-[#fff] shadow-none hover:opacity-95">
                    <Link href="/apply/awardee">
                      Apply now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-14 rounded-full border-orange-200 bg-white px-6 py-6 text-orange-700 hover:bg-orange-50"
                  >
                    <Link href="/apply/partnership">Partner with us</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-7 rounded-[30px] border border-orange-100 bg-white p-6 sm:p-8 lg:p-10">
            <div className="grid gap-5 border-b border-orange-100 pb-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-orange-700">Application routes</p>
                <h2 className="text-balance text-3xl font-semibold leading-[1.05] tracking-tight text-slate-950 sm:text-4xl lg:text-[3.15rem]">
                  Choose the route that fits how you want to enter Top100.
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:justify-self-end">
                A quick view of each route, with image and text side by side so the right path is easier to spot fast.
              </p>
            </div>

            <div className="grid gap-6">
              {applicationEntryCards.map((program, index) => {
                const Icon = program.icon
                const imageFirst = index % 2 === 0
                return (
                  <Link
                    key={program.type}
                    href={program.href}
                    className={cn(
                      'group grid overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.18)] transition-transform duration-300 hover:-translate-y-1',
                      'lg:grid-cols-[0.95fr_1.05fr]',
                    )}
                  >
                    <div
                      className={cn('relative min-h-[260px] overflow-hidden bg-slate-950', imageFirst ? 'lg:order-1' : 'lg:order-2')}
                    >
                      <Image
                        src={program.image}
                        alt={program.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover transition duration-700 group-hover:scale-[1.04]"
                        style={{ objectPosition: program.imagePosition }}
                        priority={index === 0}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-br ${program.accent} opacity-35`} />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.28)_48%,rgba(2,6,23,0.92)_100%)]" />
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <span className="inline-flex rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/90 backdrop-blur-md">
                          {program.badge}
                        </span>
                      </div>
                    </div>

                    <div
                      className={cn('flex flex-col justify-between gap-6 p-6 sm:p-8 lg:p-10', imageFirst ? 'lg:order-2' : 'lg:order-1')}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <Badge className="border-orange-200 bg-orange-50 text-orange-700">{program.badge}</Badge>
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-orange-100 bg-white text-orange-600 shadow-sm transition group-hover:bg-orange-50">
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="space-y-3">
                        <h3 className="max-w-2xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                          {program.title}
                        </h3>
                        <p className="max-w-xl text-sm leading-7 text-slate-600 sm:text-[0.98rem]">{program.summary}</p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {program.showcase.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-700"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-black/5 pt-5">
                        <p className="max-w-xl text-sm leading-6 text-slate-600">Open the route and jump straight to the next step.</p>
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 underline decoration-orange-200 underline-offset-4 transition group-hover:underline-offset-8">
                          Start here
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
