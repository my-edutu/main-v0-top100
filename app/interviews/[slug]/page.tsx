import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'

import {
  getInterviewBySlug,
  getPublishedInterviews,
  getPublishedSlugs,
} from '@/lib/interviews/queries'
import { toCardView, youtubeThumbnail } from '@/lib/interviews/mappers'
import { SITE_NAME, SITE_URL } from '@/lib/site'

import InterviewCard from '../_components/InterviewCard'
import VideoFacade from '../_components/VideoFacade'

type PageProps = { params: Promise<{ slug: string }> }

export const revalidate = 300

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs()
  return slugs.map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const interview = await getInterviewBySlug(slug)

  if (!interview) {
    return { title: `Interview not found | ${SITE_NAME}` }
  }

  const title = `${interview.title} — ${interview.awardee_name} | Impact Interviews`
  const description =
    interview.summary ||
    `${interview.awardee_name} on their work, in the Top100 Africa Future Leaders interview series.`
  const image =
    interview.thumbnail_url || (interview.video_id ? youtubeThumbnail(interview.video_id) : undefined)

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/interviews/${interview.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/interviews/${interview.slug}`,
      type: 'article',
      images: image ? [{ url: image }] : undefined,
    },
  }
}

export default async function InterviewDetailPage({ params }: PageProps) {
  const { slug } = await params
  const interview = await getInterviewBySlug(slug)

  if (!interview) {
    notFound()
  }

  const view = toCardView(interview)
  const others = (await getPublishedInterviews())
    .filter((row) => row.slug !== interview.slug)
    .slice(0, 3)
    .map(toCardView)

  const meta = [interview.country, interview.cohort_year ? `${interview.cohort_year} cohort` : null]
    .filter(Boolean)
    .join(' · ')

  const jsonLd =
    interview.format === 'video' && interview.video_id
      ? {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: interview.title,
          description: interview.summary || interview.pull_quote || interview.title,
          thumbnailUrl: view.thumbnailUrl,
          uploadDate: interview.published_at,
          embedUrl: `https://www.youtube-nocookie.com/embed/${interview.video_id}`,
        }
      : null

  return (
    <main className="bg-white">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <article className="container py-10 sm:py-14">
        <Link
          href="/interviews"
          className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All interviews
        </Link>

        <header className="mx-auto mt-8 max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600">
            Impact Interviews
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {interview.title}
          </h1>
          <p className="mt-4 text-base font-semibold text-orange-600">{interview.awardee_name}</p>
          {meta ? <p className="mt-1 text-sm text-slate-500">{meta}</p> : null}
        </header>

        {interview.format === 'video' && interview.video_id ? (
          <div className="mx-auto mt-10 max-w-4xl">
            <VideoFacade
              videoId={interview.video_id}
              title={interview.title}
              thumbnailUrl={view.thumbnailUrl}
            />
          </div>
        ) : null}

        {interview.pull_quote ? (
          <blockquote className="mx-auto mt-12 max-w-3xl border-l-4 border-orange-400 pl-6 text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
            &ldquo;{interview.pull_quote}&rdquo;
          </blockquote>
        ) : null}

        {interview.body ? (
          <div
            className="prose prose-slate mx-auto mt-10 max-w-3xl prose-headings:font-bold prose-a:text-orange-700"
            dangerouslySetInnerHTML={{ __html: interview.body }}
          />
        ) : null}

        {view.awardeeSlug ? (
          <div className="mx-auto mt-12 max-w-3xl rounded-[28px] border border-orange-100 bg-[#fffaf4] p-8 text-center">
            <p className="text-sm text-slate-600">
              {interview.awardee_name} is a Top100 Africa Future Leaders awardee.
            </p>
            <Link
              href={`/awardees/${view.awardeeSlug}`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            >
              View their profile
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        ) : null}

        {others.length > 0 ? (
          <section className="mt-20">
            <h2 className="text-2xl font-bold text-slate-900">More interviews</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((item) => (
                <InterviewCard key={item.id} interview={item} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-16 text-center">
          <Link
            href="/interviews#apply"
            className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-7 py-3.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
          >
            Apply to be interviewed
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </article>
    </main>
  )
}
