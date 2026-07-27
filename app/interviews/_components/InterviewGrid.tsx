'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { InterviewCardView } from '@/lib/interviews/mappers'
import InterviewCard from './InterviewCard'

type FormatFilter = 'all' | 'video' | 'written'

export default function InterviewGrid({ interviews }: { interviews: InterviewCardView[] }) {
  const [year, setYear] = useState<number | 'all'>('all')
  const [format, setFormat] = useState<FormatFilter>('all')

  const years = useMemo(
    () =>
      Array.from(
        new Set(
          interviews
            .map((item) => item.cohortYear)
            .filter((value): value is number => Boolean(value)),
        ),
      ).sort((a, b) => b - a),
    [interviews],
  )

  const visible = useMemo(
    () =>
      interviews.filter(
        (item) =>
          (year === 'all' || item.cohortYear === year) &&
          (format === 'all' || item.format === format),
      ),
    [interviews, year, format],
  )

  // The series launches empty. A bare grid reads as a broken page, so the
  // absence of interviews is stated plainly and pushed at the apply form.
  if (interviews.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-orange-200 bg-[#fffaf4] px-6 py-16 text-center">
        <p className="text-lg font-semibold text-slate-900">The first season is being recorded</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Interviews go live here as they are published. Awardees can apply now to be part of the
          first set.
        </p>
        <Link
          href="#apply"
          className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
        >
          Apply to be interviewed
        </Link>
      </div>
    )
  }

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2',
      active
        ? 'border-orange-500 bg-orange-500 text-white'
        : 'border-orange-100 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-700',
    )

  const showFilters = years.length > 1 || interviews.some((item) => item.format === 'written')

  return (
    <div>
      {showFilters ? (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setYear('all')} className={chip(year === 'all')}>
            All years
          </button>
          {years.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setYear(value)}
              className={chip(year === value)}
            >
              {value}
            </button>
          ))}

          <span className="mx-1 hidden h-5 w-px bg-orange-100 sm:block" />

          {(['all', 'video', 'written'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormat(value)}
              className={chip(format === value)}
            >
              {value === 'all' ? 'All formats' : value === 'video' ? 'Video' : 'Written Q&A'}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-[22px] border border-orange-100 bg-white px-6 py-12 text-center text-sm text-slate-600">
          No interviews match those filters yet.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((interview) => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
        </div>
      )}
    </div>
  )
}
