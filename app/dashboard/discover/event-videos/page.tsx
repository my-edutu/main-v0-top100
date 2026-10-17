import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, BookOpen, LockKeyhole, Play } from 'lucide-react'

import { requireSessionsAccess } from '@/lib/sessions-access'
import { archiveYears, getSessionsByYear } from '@/lib/sessions'
import { loadAflCalendarEvents } from '@/lib/events/live-calendar'
import type { Session } from '@/lib/sessions'
import type { LiveCalendarEvent } from '@/lib/events/live-calendar'

export const metadata: Metadata = {
  title: 'Past sessions | Africa Future Leaders',
  description: 'Revisit recordings, presentations, workshops, and notes from awardee sessions.',
}

const yearParamValues = archiveYears.map(String)

function SessionArchiveCard({ session }: { session: Session }) {
  const hasVideo = session.resources.some((resource) => resource.type === 'video')
  const content = (
    <>
      <span className="event-library-session-row__cover" aria-hidden="true" style={{ position: 'relative' }}>
        {session.coverImage ? (
          <Image
            src={session.coverImage}
            alt=""
            fill
            loading={session.slug === '2026-onboarding' ? 'eager' : 'lazy'}
            sizes="(max-width: 700px) 92px, 108px"
            className="event-library-session-row__cover-image"
          />
        ) : (
          <span className="event-library-session-row__fallback">
            {hasVideo ? <Play size={22} /> : <BookOpen size={22} />}
          </span>
        )}
      </span>
      <span className="event-library-session-row__copy">
        <span className="event-library-session-row__title">{session.title}</span>
        <span className="event-library-session-row__presenter">
          {session.presenter ? `With ${session.presenter}` : 'Speaker to be announced'}
        </span>
        <span className={`event-library-session-row__action${session.locked ? ' is-locked' : ''}`}>
          {session.locked ? <><LockKeyhole size={14} aria-hidden="true" /> Locked</> : <>View session <ArrowRight size={15} aria-hidden="true" /></>}
        </span>
      </span>
    </>
  )

  if (session.locked) {
    return <article className="event-library-session-row is-locked" aria-label={`${session.title}, locked`}>{content}</article>
  }

  return (
    <Link href={`/dashboard/discover/event-videos/${session.slug}`} className="event-library-session-row">
      {content}
    </Link>
  )
}

export default async function EventVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  await requireSessionsAccess('/dashboard/discover/event-videos')

  const params = await searchParams
  const selectedYear = yearParamValues.includes(params.year ?? '') ? Number(params.year) : 2026
  let eventPageSessions: LiveCalendarEvent[] = []
  if (selectedYear === 2026) {
    try {
      eventPageSessions = await loadAflCalendarEvents()
    } catch {
      // Keep the two published archive entries available if the calendar is temporarily offline.
    }
  }
  const sessions = getSessionsByYear(eventPageSessions).find((group) => group.year === selectedYear)?.sessions ?? []

  return (
    <main className="event-library space-y-8 sm:space-y-10">
      <section className="event-library-hero" aria-labelledby="event-library-title">
        <Image
          className="event-library-hero__image"
          src="/images/past-sessions-hero.webp"
          alt="Awardees taking part in a facilitated learning session"
          fill
          loading="eager"
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <div className="event-library-hero__scrim" aria-hidden="true" />
        <div className="event-library-hero__content">
          <p className="event-library-hero__eyebrow">Member learning library</p>
          <h1 id="event-library-title">Past sessions</h1>
          <p>Ideas and tools from across the Africa Future Leaders community.</p>
        </div>
      </section>

      <section aria-labelledby="event-library-years-title">
        <h2 id="event-library-years-title" className="sr-only">Session archive year</h2>
        <nav className="event-library-years" aria-label="Session archive year">
          {archiveYears.slice().sort((a, b) => a - b).map((year) => {
            const active = year === selectedYear
            return (
              <Link
                key={year}
                href={`/dashboard/discover/event-videos?year=${year}`}
                className={`event-library-year-card event-library-year-card--${year}${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={`View ${year} sessions`}
              >
                <span className="event-library-year-card__year">{year}</span>
              </Link>
            )
          })}
        </nav>
      </section>

      <section aria-labelledby="event-library-selected-year">
        <h2 id="event-library-selected-year" className="sr-only">Sessions for {selectedYear}</h2>

        {sessions.length > 0 ? (
          <div className="event-library-session-list">
            {sessions.map((session) => <SessionArchiveCard key={`${session.slug}-${session.title}`} session={session} />)}
          </div>
        ) : (
          <div className="event-library-coming-soon" role="status">
            <Image
              className="event-library-coming-soon__illustration"
              src="/images/session-archive-empty.svg"
              width={92}
              height={82}
              alt=""
              aria-hidden="true"
            />
            <div>
              <h3>Coming soon</h3>
              <p>We’re bringing this archive together.</p>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
