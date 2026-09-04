"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, UsersRound } from "lucide-react"

import { flagFromCountryCode } from "@/lib/avatars"
import { IMPACT_HERO } from "@/lib/impact-content"

const countries = [
  { name: "Nigeria", code: "ng" }, { name: "United Kingdom", code: "gb" }, { name: "Kenya", code: "ke" },
  { name: "Canada", code: "ca" }, { name: "Tanzania", code: "tz" }, { name: "South Africa", code: "za" },
  { name: "Cameroon", code: "cm" }, { name: "Netherlands", code: "nl" }, { name: "Ethiopia", code: "et" },
  { name: "Namibia", code: "na" }, { name: "Burkina Faso", code: "bf" }, { name: "India", code: "in" },
  { name: "China", code: "cn" }, { name: "Thailand", code: "th" }, { name: "United States", code: "us" },
  { name: "Zimbabwe", code: "zw" }, { name: "Portugal", code: "pt" }, { name: "North Macedonia", code: "mk" },
  { name: "France", code: "fr" }, { name: "Spain", code: "es" }, { name: "Pakistan", code: "pk" },
  { name: "Zambia", code: "zm" }, { name: "Mozambique", code: "mz" }, { name: "Egypt", code: "eg" },
  { name: "Armenia", code: "am" }, { name: "Liberia", code: "lr" }, { name: "Sudan", code: "sd" },
  { name: "Argentina", code: "ar" }, { name: "Côte d'Ivoire", code: "ci" },
  { name: "Democratic Republic of the Congo", code: "cd" }, { name: "Morocco", code: "ma" },
] as const

function HomePageHeroSection() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <section className="relative flex min-h-[620px] items-center justify-center overflow-hidden bg-white text-slate-900 sm:min-h-[680px] md:min-h-[720px] dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full px-4 pb-28 pt-16 sm:px-6 sm:pb-32 sm:pt-20 md:px-8 md:pb-36 lg:pb-40 lg:pt-24"
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

          <div className="mx-auto flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Link href={IMPACT_HERO.primaryCta.href} className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 font-semibold text-white hover:bg-orange-600">
              {IMPACT_HERO.primaryCta.label}<ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={IMPACT_HERO.secondaryCta.href} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-6 font-semibold text-slate-950 hover:border-orange-500 hover:text-orange-700 dark:border-slate-700 dark:text-white">
              <UsersRound className="h-4 w-4" />{IMPACT_HERO.secondaryCta.label}
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
        <div className="py-3 text-center">
          <p className="text-base font-medium text-slate-600 dark:text-slate-400 sm:text-lg">impact across 31 countries worldwide</p>
        </div>
        <div className="relative w-full overflow-hidden pb-3 pt-1">
          <div className="flex whitespace-nowrap" style={{ animation: "slide 40s linear infinite" }}>
            {[...countries, ...countries].map((country, index) => (
              <div key={`${country.code}-${index}`} className="mx-8 flex flex-shrink-0 flex-col items-center justify-center">
                <span aria-hidden className="mb-1.5 text-3xl leading-none sm:text-4xl">{flagFromCountryCode(country.code)}</span>
                <span className="max-w-[100px] truncate text-center text-xs leading-tight text-slate-700 dark:text-slate-300 sm:text-sm">{country.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`@keyframes slide { from { transform: translateX(0); } to { transform: translateX(-100%); } }`}</style>
    </section>
  )
}

export default HomePageHeroSection
