import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'

export default function InterviewsHero() {
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[#05060f] px-6 py-16 text-center sm:px-12 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, rgba(249,115,22,0.35) 0%, rgba(5,6,15,0) 70%), radial-gradient(40% 40% at 85% 90%, rgba(245,158,11,0.22) 0%, rgba(5,6,15,0) 70%)',
        }}
      />
      <div className="relative mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-300">
          Impact Interviews
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">
          The stories behind the Top 100
        </h1>
        <p className="mt-5 text-base leading-relaxed text-white/75 sm:text-lg">
          Awardees on the work they are doing, the setbacks that shaped it, and the Africa they are
          building. Recorded in their own words.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#apply"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-7 py-3.5 text-sm font-semibold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05060f] sm:w-auto"
          >
            Apply to be interviewed
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#watch"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:w-auto"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Watch the latest
          </Link>
        </div>
      </div>
    </section>
  )
}
