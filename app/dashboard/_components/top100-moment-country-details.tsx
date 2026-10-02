'use client'

import { motion } from 'framer-motion'

import { flagEmoji } from '@/lib/avatars'
import {
  AFRICAN_APPLICANT_COUNTRIES,
  OTHER_APPLICANT_COUNTRIES,
  TOP_APPLICANT_COUNTRIES,
} from '@/lib/dashboard/top100-moment-countries'

function CountryFlag({ country }: { country: string }) {
  if (country === 'Northern Cyprus') {
    return (
      <svg viewBox="0 0 60 40" aria-hidden="true" className="h-7 w-10 shrink-0 overflow-hidden rounded shadow-sm">
        <rect width="60" height="40" fill="#fff" />
        <path d="M0 8h60M0 32h60" stroke="#d71920" strokeWidth="5" />
        <path d="M26 15a6 6 0 1 0 8 8 7 7 0 1 1-8-8Z" fill="#d71920" />
        <path d="m39 14 1.2 3.5 3.7.1-3 2.2 1.1 3.6-3-2.2-3 2.2 1.1-3.6-3-2.2 3.7-.1Z" fill="#d71920" />
      </svg>
    )
  }

  return <span aria-hidden="true" className="shrink-0 text-[22px] leading-none">{flagEmoji(country)}</span>
}

function CountryChip({ country, index, reducedMotion }: { country: string; index: number; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.72, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 22, delay: Math.min(index * 0.012, 0.55) }}
      className="flex min-h-12 min-w-0 items-center gap-2 rounded-xl border border-black/10 bg-white/65 px-2.5 py-2 text-sm text-[#171717]"
    >
      <CountryFlag country={country} />
      <span className="min-w-0 truncate">{country}</span>
    </motion.div>
  )
}

export function Top100ApplicantCountryDetails({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="mx-auto w-full max-w-5xl pb-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[#171717]/65">Applicants came from</p>
        <h1 className="mt-2 text-balance text-3xl font-semibold leading-tight tracking-[-.04em] sm:text-4xl">61 countries, represented here.</h1>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-sm">
        <div className="rounded-xl border border-black/10 bg-white/55 px-3 py-2.5">
          <p className="text-2xl font-bold tabular-nums leading-none">46</p>
          <p className="mt-1 text-xs text-[#171717]/70">African countries</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white/55 px-3 py-2.5">
          <p className="text-2xl font-bold tabular-nums leading-none">15</p>
          <p className="mt-1 text-xs text-[#171717]/70">Non-African countries</p>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-black/10 bg-white/45 p-3 sm:p-4" aria-labelledby="top-countries-title">
        <h2 id="top-countries-title" className="text-sm font-semibold">Most represented</h2>
        <ol className="mt-3 space-y-2.5">
          {TOP_APPLICANT_COUNTRIES.map((item, index) => (
            <motion.li
              key={item.name}
              initial={reducedMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reducedMotion ? { duration: 0 } : { delay: index * 0.07 }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium"><CountryFlag country={item.name} /><span className="truncate">{item.name}</span></span>
              <span className="text-sm font-bold tabular-nums">{item.count.toLocaleString('en-US')}</span>
              <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-black/10">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${item.count / TOP_APPLICANT_COUNTRIES[0].count * 100}%` }}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.8, delay: index * 0.07, ease: 'easeOut' }}
                  className="block h-full rounded-full bg-[#171717]"
                />
              </span>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="mt-5" aria-labelledby="african-countries-title">
        <h2 id="african-countries-title" className="text-sm font-semibold">Africa <span className="font-normal text-[#171717]/65">· 46</span></h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {AFRICAN_APPLICANT_COUNTRIES.map((country, index) => <CountryChip key={country} country={country} index={index} reducedMotion={reducedMotion} />)}
        </div>
      </section>

  <section className="mt-5" aria-labelledby="other-countries-title">
        <h2 id="other-countries-title" className="text-sm font-semibold">Non-African countries <span className="font-normal text-[#171717]/65">· 15</span></h2>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {OTHER_APPLICANT_COUNTRIES.map((country, index) => <CountryChip key={country} country={country} index={index + AFRICAN_APPLICANT_COUNTRIES.length} reducedMotion={reducedMotion} />)}
        </div>
      </section>
    </div>
  )
}
