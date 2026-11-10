"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Handshake } from "lucide-react"

import { IMPACT_HERO } from "@/lib/impact-content"

export function HeroCtas() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
      <Link
        href={IMPACT_HERO.primaryCta.href}
        className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 px-6 font-semibold text-slate-950 transition-[transform,filter] duration-300 hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-4 motion-reduce:transform-none"
      >
        {IMPACT_HERO.primaryCta.label}
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none" />
      </Link>
      <Link
        href={IMPACT_HERO.secondaryCta.href}
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 font-semibold text-slate-950 transition-colors hover:border-orange-700 hover:text-orange-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-4 dark:border-slate-700 dark:text-[#fff]"
      >
        <Handshake aria-hidden="true" className="h-4 w-4" />
        {IMPACT_HERO.secondaryCta.label}
      </Link>
    </div>
  )
}

function HomePageHeroSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative flex min-h-[620px] items-center justify-center overflow-hidden bg-white text-slate-900 sm:min-h-[680px] md:min-h-[720px] dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full px-4 py-16 sm:px-6 sm:py-20 md:px-8 lg:py-24"
      >
        <div className="mx-auto max-w-5xl space-y-7 text-center sm:space-y-8">
          <div className="space-y-4 sm:space-y-5">
            <p className="mx-auto w-fit rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-700">
              {IMPACT_HERO.eyebrow}
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[0.98] text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl dark:text-white">
              {IMPACT_HERO.title}
            </h1>
            <p className="mx-auto max-w-3xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8 md:text-xl dark:text-slate-200">
              {IMPACT_HERO.description}
            </p>
          </div>

          <HeroCtas />
        </div>
      </motion.div>
    </section>
  )
}

export default HomePageHeroSection
