import Link from 'next/link'
import { ArrowLeft, Check, Clock3, Video } from 'lucide-react'
import type { MemberProgrammeEvent } from '@/lib/events/programme-api'
import { CalendarAction } from './calendar-action'
import { SpeakerBlock } from './speaker-block'

export function ProgrammeEventDetail({ event }: { event: MemberProgrammeEvent }) {
  const date = event.startAt
    ? new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: event.timezone }).format(new Date(event.startAt))
    : 'Date to be announced'
  const time = event.startAt && event.endAt
    ? `${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: event.timezone }).format(new Date(event.startAt))}–${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: event.timezone }).format(new Date(event.endAt))}`
    : 'Time to be announced'

  return <article className="programme-detail">
    <Link href="/dashboard/discover/events" className="programme-back-link"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to events</Link>
    <div className="programme-detail-hero" style={event.featuredImageUrl ? { backgroundImage: `url("${event.featuredImageUrl}")` } : undefined}>
      <div className="programme-detail-hero-wash" />
      <div className="relative z-10 max-w-3xl">
        <p className="programme-kicker">{event.sessionNumber === 0 ? 'Onboarding' : `Session ${String(event.sessionNumber ?? '').padStart(2, '0')}`} · Africa Future Leaders</p>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl">{event.title}</h1>
        {event.subtitle ? <p className="mt-4 max-w-2xl text-lg text-orange-50/80">{event.subtitle}</p> : null}
      </div>
    </div>
    <div className="programme-detail-grid">
      <div className="min-w-0">
        <div className="programme-detail-meta"><span><Clock3 aria-hidden="true" className="h-4 w-4" />{date} · {time} WAT</span><span><Video aria-hidden="true" className="h-4 w-4" />Virtual · 60 minutes</span></div>
        {event.description || event.summary ? <p className="mt-6 text-base leading-8 text-stone-700">{event.description ?? event.summary}</p> : null}
        {event.learningOutcomes.length ? <section className="mt-9" aria-labelledby="outcomes-heading">
          <h2 id="outcomes-heading" className="text-xl font-semibold tracking-tight text-stone-950">What you’ll leave with</h2>
          <ul className="mt-4 space-y-3">{event.learningOutcomes.map(outcome => <li key={outcome} className="flex gap-3 text-sm leading-6 text-stone-700"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-orange-600" />{outcome}</li>)}</ul>
        </section> : null}
      </div>
      <aside className="programme-detail-aside">
        <SpeakerBlock speaker={event.speaker} />
        <CalendarAction eventId={event.id} title={event.title} startAt={event.startAt} endAt={event.endAt} timezone={event.timezone} meetingUrl={event.registrationUrl} calendarUrl={event.calendarUrl} />
        <p className="text-xs leading-5 text-stone-500">Calendar entries are snapshots. If the programme changes, add the event again to refresh your device calendar.</p>
      </aside>
    </div>
  </article>
}
