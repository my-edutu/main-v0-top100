import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Clock3, Video } from 'lucide-react'

import type { MemberProgrammeEvent } from '@/lib/events/programme-api'
import { CalendarAction } from './calendar-action'
import { SpeakerBlock } from './speaker-block'
import { ProgrammeCover } from './programme-cover'

const dateTime = (value: string | null, timeZone: string, options: Intl.DateTimeFormatOptions) => value
  ? new Intl.DateTimeFormat('en', { ...options, timeZone }).format(new Date(value))
  : 'Date to be announced'

export function ProgrammeEventCard({ event, completed = false, index = 0 }: { event: MemberProgrammeEvent; completed?: boolean; index?: number }) {
  const date = dateTime(event.startAt, event.timezone, { weekday: 'short', month: 'short', day: 'numeric' })
  const time = event.startAt && event.endAt
    ? `${dateTime(event.startAt, event.timezone, { hour: 'numeric', minute: '2-digit' })}–${dateTime(event.endAt, event.timezone, { hour: 'numeric', minute: '2-digit' })}`
    : 'Time to be announced'

  return (
    <article className={`programme-event-card ${completed ? 'is-completed' : ''}`}>
      <Link href={`/dashboard/discover/events/${event.slug}`} className="programme-event-card-link group">
        <ProgrammeCover sessionNumber={event.sessionNumber} className={`programme-event-art programme-event-art-${index % 4}`} />
        <div className="programme-event-copy">
          <div className="programme-event-date"><CalendarDays aria-hidden="true" className="h-4 w-4" />{date}</div>
          <div className="programme-event-heading"><h3>{event.title}</h3><ArrowUpRight aria-hidden="true" className="programme-event-arrow" /></div>
          {event.summary ? <p className="programme-event-summary">{event.summary}</p> : null}
          <div className="programme-event-meta"><span><Clock3 aria-hidden="true" className="h-4 w-4" />{time} WAT</span><span><Video aria-hidden="true" className="h-4 w-4" />Virtual</span></div>
        </div>
      </Link>
      <div className="programme-event-footer">
        <SpeakerBlock speaker={event.speaker} />
        <CalendarAction eventId={event.id} title={event.title} startAt={event.startAt} endAt={event.endAt} timezone={event.timezone} meetingUrl={event.registrationUrl} calendarUrl={event.calendarUrl} />
      </div>
    </article>
  )
}
