'use client'

import { CalendarPlus, Download } from 'lucide-react'

type Props = {
  eventId: string
  title: string
  startAt: string | null
  endAt: string | null
  timezone: string
  meetingUrl: string | null
  calendarUrl: string
}

export function CalendarAction({ eventId, title, startAt, endAt, calendarUrl }: Props) {
  if (!startAt || !endAt) return null

  return (
    <div className="programme-calendar-action" onClick={(event) => event.stopPropagation()}>
      <a className="programme-calendar-primary" href={calendarUrl} download={`${eventId}.ics`} aria-label={`Add ${title} to your calendar`}>
        <CalendarPlus aria-hidden="true" className="h-4 w-4" />
        <span>Add to calendar</span>
      </a>
      <a className="programme-calendar-fallback" href={calendarUrl} download={`${eventId}.ics`} aria-label={`Download calendar file for ${title}`}>
        <Download aria-hidden="true" className="h-3.5 w-3.5" />
        <span>ICS</span>
      </a>
      <span className="sr-only">Add to calendar. Calendar entries are snapshots and will not automatically update if the schedule changes.</span>
    </div>
  )
}
