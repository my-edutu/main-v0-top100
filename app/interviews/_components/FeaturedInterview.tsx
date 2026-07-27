import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { InterviewCardView } from '@/lib/interviews/mappers'
import VideoFacade from './VideoFacade'

export default function FeaturedInterview({ interview }: { interview: InterviewCardView }) {
  const meta = [interview.country, interview.cohortYear ? `${interview.cohortYear} cohort` : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <section id="watch" className="scroll-mt-24">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
        Latest interview
      </p>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-center">
        {interview.format === 'video' && interview.videoId ? (
          <VideoFacade
            videoId={interview.videoId}
            title={interview.title}
            thumbnailUrl={interview.thumbnailUrl}
          />
        ) : null}

        <div>
          {interview.pullQuote ? (
            <blockquote className="border-l-4 border-orange-400 pl-5 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
              &ldquo;{interview.pullQuote}&rdquo;
            </blockquote>
          ) : (
            <h2 className="text-2xl font-bold text-slate-900">{interview.title}</h2>
          )}

          <p className="mt-5 text-base font-semibold text-orange-600">{interview.awardeeName}</p>
          {meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/interviews/${interview.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              {interview.format === 'written' ? 'Read the interview' : 'Watch full interview'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {interview.awardeeSlug ? (
              <Link
                href={`/awardees/${interview.awardeeSlug}`}
                className="inline-flex items-center rounded-full border border-orange-200 px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
              >
                View profile
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
