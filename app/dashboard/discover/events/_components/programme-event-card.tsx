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
        <ProgrammeCover sessionNumber={event.sessionNumber} title={event.title} date={date} className={`programme-event-art programme-event-art-${index % 4}`} />
        <ArrowUpRight aria-hidden="true" className="programme-event-arrow h-5 w-5" />
        <div className="programme-event-copy">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-700">
            <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />{date}</span>
            <span className="inline-flex items-center gap-1"><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />60 min</span>
          </div>
          <h3 className="mt-3 text-xl font-semibold leading-tight tracking-[-0.03em] text-stone-950">{event.title}</h3>
          {event.summary ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{event.summary}</p> : null}
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-stone-500"><Video aria-hidden="true" className="h-4 w-4 text-orange-500" />Virtual · {time} WAT</div>
        </div>
      </Link>
      <div className="programme-event-footer">
        <SpeakerBlock speaker={event.speaker} />
        <CalendarAction eventId={event.id} title={event.title} startAt={event.startAt} endAt={event.endAt} timezone={event.timezone} meetingUrl={event.registrationUrl} calendarUrl={event.calendarUrl} />
      </div>
    </article>
  )
}
