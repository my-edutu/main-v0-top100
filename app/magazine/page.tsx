"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const highlightSections = [
  {
    title: "Leadership In Action",
    description:
      "Journeys of student founders, policy innovators, and creative pioneers translating bold ideas into tangible impact.",
  },
  {
    title: "Deals & Opportunities",
    description:
      "Investor spotlights, funding pathways, and partnership playbooks tailored for mission-driven African talent.",
  },
  {
    title: "Communities Reimagined",
    description:
      "Stories of awardees co-creating solutions in health, education, climate resilience, and inclusive growth.",
  },
]

const contributorQuotes = [
  {
    quote:
      "Every edition is a rallying cry—it proves that Africa’s future is already here, and it is brilliantly youth-led.",
    name: "Lerato Khumalo",
    role: "Top100 Climate Fellow, 2024",
  },
  {
    quote:
      "The magazine helped our team unlock new partnerships across three continents. The storytelling is that compelling.",
    name: "Chinedu Okafor",
    role: "Co-Founder, MedAccess Africa",
  },
]

const purchaseOptions = [
  {
    title: "Digital Edition",
    description: "Instant download in high-resolution PDF with bonus multimedia stories and shareable assets.",
    price: "$18",
    ctaLabel: "Read the 2024 Edition",
    href: "/magazine/2024",
  },
  {
    title: "Print Collector’s Set",
    description:
      "Limited-run premium print delivered worldwide, featuring tactile finishes and exclusive photography spreads.",
    price: "$45",
    ctaLabel: "Order Print Copy",
    href: "/magazine/2024#order",
  },
]

export default function MagazinePage() {
  return (
    <div className="bg-black text-white">
      <main className="container mx-auto space-y-20 px-4 py-16 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-orange-400/20 bg-zinc-900/80 p-10 shadow-xl lg:p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.12),_transparent_60%)]" />
          <div className="relative z-10 grid gap-12 lg:grid-cols-[3fr_2fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.35em] text-orange-300">Top100 Africa Future Leaders</p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl text-gray-800 dark:text-white">
                Africa Future Leaders Magazine
              </h1>
              <p className="text-lg text-gray-700 dark:text-zinc-300 lg:text-xl">
                Your annual immersion into the stories, strategies, and ecosystems powering the continent’s most
                promising young changemakers. Crafted for leaders, partners, and investors who want to understand where
                the future is being built—today.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button className="rounded-xl bg-yellow-500 px-6 py-6 text-black shadow-lg shadow-yellow-500/30 hover:bg-yellow-400">
                  <Link href="/magazine/2024">Explore 2024 Digital Edition</Link>
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-yellow-400/60 px-6 py-6 text-white hover:bg-yellow-500/10"
                >
                  <Link href="/magazine/2024#order">Purchase 2024 Print Edition</Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden h-full w-full overflow-hidden rounded-2xl border border-orange-400/20 bg-black/50 lg:block">
              <Image
                src="https://images.unsplash.com/photo-1529337652727-87cc994c14fb?auto=format&fit=crop&w=900&q=80"
                alt="Africa Future Leaders Magazine cover spread"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black/50" />
            </div>
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-10 shadow-sm lg:p-12">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Inside the 2024 Edition</h2>
            <p className="text-zinc-300">
              A curated, continent-wide view of transformative leadership—documenting how ideas move from campus to
              community and into global markets.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highlightSections.map((section) => (
              <div
                key={section.title}
                className="rounded-3xl border border-white/10 bg-black/40 p-6 shadow-sm transition hover:border-orange-400/40 hover:shadow-lg"
              >
                <h3 className="text-lg font-semibold text-white">{section.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-zinc-300">{section.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-12 lg:grid-cols-[3fr_2fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-white">Why the Magazine Matters</h2>
            <p className="text-lg text-gray-700 dark:text-zinc-300">
              Africa Future Leaders Magazine goes beyond celebration; it is a blueprint for how youth-led innovation is
              reshaping industries, influencing policy, and attracting serious capital. Every spread is anchored in
              data, context, and actionable insights.
            </p>
            <ul className="space-y-3 text-sm text-zinc-200">
              <li className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                Annual state-of-the-continent perspective on youth innovation and leadership.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                Tactical frameworks for governments, universities, and partners supporting emerging talent.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                Data-backed case studies revealing how Top100 alumni scale solutions beyond their home countries.
              </li>
            </ul>
          </div>
          <div className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-sm">
            {contributorQuotes.map((testimonial) => (
              <blockquote key={testimonial.name} className="space-y-3 text-zinc-200">
                <p className="text-lg leading-relaxed text-white">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="text-sm text-zinc-400">
                  <span className="font-semibold text-white">{testimonial.name}</span>
                  <br />
                  {testimonial.role}
                </div>
              </blockquote>
            ))}
          </div>
        </section>

        <section className="space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm lg:p-12">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Purchase the 2024 Editions</h2>
            <p className="text-zinc-300">
              Choose the experience that fits your reading ritual. Digital access is instant; print copies ship from Lagos and London.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {purchaseOptions.map((option) => (
              <div
                key={option.title}
                className="flex h-full flex-col justify-between rounded-3xl border border-orange-400/20 bg-black/40 p-6 shadow-sm transition hover:border-orange-400/40 hover:shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-xl font-semibold text-white">{option.title}</h3>
                    <span className="text-lg font-semibold text-orange-300">{option.price}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-300">{option.description}</p>
                </div>
                <Button className="mt-6 rounded-xl bg-yellow-500 px-6 py-6 text-black hover:bg-yellow-400" asChild>
                  <Link href={option.href}>{option.ctaLabel}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-white">What Readers Receive</h2>
              <p className="text-zinc-300">
                A multi-format experience combining deep reporting, visual storytelling, and partner spotlights to help
                you connect with Africa’s next generation of leaders.
              </p>
              <ul className="space-y-3 text-sm text-zinc-200">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                  64 awardee profiles arranged by impact theme with exclusive photography series.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                  Expert essays from partners, investors, and policymakers shaping youth ecosystems.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-orange-300" aria-hidden="true" />
                  A directory of opportunities, grants, and labs curated for Africa Future Leaders community members.
                </li>
              </ul>
            </div>
            <div className="relative h-72 w-full overflow-hidden rounded-3xl border border-white/10">
              <Image
                src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80"
                alt="Readers engaging with the magazine"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/50" />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm lg:p-12">
          <div className="mx-auto max-w-3xl space-y-6 text-center">
            <h2 className="text-2xl font-semibold text-white">Join the Reader Community</h2>
            <p className="text-zinc-300">
              Subscribe for magazine updates, launch events, and tailored opportunities for collaborators across Africa
              and the diaspora.
            </p>
            <form
              className="flex flex-col gap-4 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <Input
                type="email"
                required
                placeholder="Enter your email address"
                className="flex-1 rounded-xl border-white/20 bg-black/40 text-white placeholder:text-zinc-400 focus-visible:ring-orange-400"
              />
              <Button type="submit" className="rounded-xl bg-yellow-500 px-6 py-6 text-black hover:bg-yellow-400">
                Subscribe
              </Button>
            </form>
          </div>
        </section>

        <section className="rounded-3xl border border-orange-400/20 bg-orange-500/20 p-10 text-center shadow-lg">
          <h2 className="text-3xl font-semibold text-white">Let’s Keep Africa’s Future Stories Front & Centre</h2>
          <p className="mt-4 text-lg text-gray-800 dark:text-orange-100">
            Whether you are an educator, policymaker, investor, or alumni, the Africa Future Leaders Magazine keeps you
            in sync with the continent’s boldest youth-led breakthroughs.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-100" asChild>
              <Link href="/magazine/2024">Read the 2024 Edition</Link>
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-white/40 bg-transparent px-6 py-6 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/magazine/2025">Preview Upcoming Editions</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  )
}
