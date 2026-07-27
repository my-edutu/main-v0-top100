import type { Metadata } from 'next'

import { getPublishedInterviews } from '@/lib/interviews/queries'
import { pickFeatured, toCardView } from '@/lib/interviews/mappers'
import { SITE_URL } from '@/lib/site'

import ApplyForm from './_components/ApplyForm'
import EligibilityBands from './_components/EligibilityBands'
import FeaturedInterview from './_components/FeaturedInterview'
import InterviewCard from './_components/InterviewCard'
import InterviewGrid from './_components/InterviewGrid'
import InterviewsFaq from './_components/InterviewsFaq'
import InterviewsHero from './_components/InterviewsHero'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Impact Interviews | Top100 Africa Future Leaders',
  description:
    'Top100 awardees on the work they are doing, the setbacks that shaped it, and the Africa they are building. Watch the series and apply to be interviewed.',
  alternates: { canonical: `${SITE_URL}/interviews` },
  openGraph: {
    title: 'Impact Interviews | Top100 Africa Future Leaders',
    description: 'The stories behind the Top 100, in awardees’ own words.',
    url: `${SITE_URL}/interviews`,
    type: 'website',
  },
}

export default async function InterviewsPage() {
  // Prefill deliberately does NOT happen here. Reading auth cookies in this
  // server component opts the whole route out of static generation, and most
  // visitors to a public page are anonymous. ApplyForm fetches it client-side.
  const rows = await getPublishedInterviews()

  const featuredRow = pickFeatured(rows)
  const featured = featuredRow ? toCardView(featuredRow) : null
  const cards = rows.map(toCardView)
  const upNext = cards.filter((card) => card.id !== featured?.id).slice(0, 3)

  return (
    <main className="bg-white">
      <div className="container space-y-20 py-10 sm:py-14">
        <InterviewsHero />

        {featured ? (
          <div className="space-y-12">
            <FeaturedInterview interview={featured} />

            {upNext.length > 0 ? (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Up next
                </h2>
                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {upNext.map((interview) => (
                    <InterviewCard key={interview.id} interview={interview} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <section>
          {cards.length > 0 ? (
            <h2 className="mb-8 text-2xl font-bold text-slate-900">All interviews</h2>
          ) : null}
          <InterviewGrid interviews={cards} />
        </section>

        <EligibilityBands />

        <section id="apply" className="scroll-mt-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Apply to be interviewed
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Open to Top100 awardees from every cohort. Tell us what the interview would be about
              and we will come back to you either way.
            </p>
          </div>
          <div className="mx-auto mt-9 max-w-3xl">
            <ApplyForm />
          </div>
        </section>

        <div className="mx-auto max-w-3xl">
          <InterviewsFaq />
        </div>
      </div>
    </main>
  )
}
