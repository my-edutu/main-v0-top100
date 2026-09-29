import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import ApplyForm from '../_components/ApplyForm'
import { ogMetadata } from '@/lib/og'
import { pageOg } from '@/lib/og-pages'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Apply for an Impact Interview | Top100 Africa Future Leaders',
  description: 'Top100 awardees can apply to share the work, turning points, and ideas behind their impact.',
  alternates: { canonical: `${SITE_URL}/interviews/apply` },
  ...ogMetadata(pageOg('/interviews/apply'), { url: '/interviews/apply' }),
}

export default function InterviewApplicationPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container max-w-4xl space-y-8 py-10 sm:py-14">
        <Link
          href="/interviews"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-600 transition hover:bg-orange-50 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Impact Interviews
        </Link>

        <section className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">Impact Interviews</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
            Apply to be interviewed
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Open to Top100 awardees from every cohort. Tell us what your interview would be about
            and we will get back to you either way.
          </p>
        </section>

        <div className="mx-auto max-w-3xl">
          <ApplyForm />
        </div>
      </div>
    </main>
  )
}
