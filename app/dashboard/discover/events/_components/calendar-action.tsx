'use client'

import { CalendarPlus, Download } from 'lucide-react'
import { useEffect, createElement } from 'react'

type Props = {
  eventId: string
  title: string
  startAt: string | null
  endAt: string | null
  timezone: string
  meetingUrl: string | null
  calendarUrl: string
}

export function CalendarAction({ eventId, title, startAt, endAt, timezone, meetingUrl, calendarUrl }: Props) {
  useEffect(() => {
    void import('add-to-calendar-button')
  }, [])

  if (!startAt || !endAt) return null
  const start = new Date(startAt)
  const end = new Date(endAt)
  const dateValue = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(start)
  const endDateValue = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(end)
  const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

  return (
    <div className="programme-calendar-action" onClick={(event) => event.stopPropagation()}>
      {createElement('add-to-calendar-button', {
        name: title,
        'start-date': dateValue,
        'end-date': endDateValue,
        'start-time': timeFormatter.format(start),
        'end-time': timeFormatter.format(end),
        'time-zone': timezone,
        location: meetingUrl ?? 'Virtual · Africa Future Leaders',
        options: "['google','apple','ical','ms365','outlookcom']",
        'list-style': 'modal',
        trigger: 'click',
        inline: true,
        'button-style': 'flat',
        'light-mode': 'bodyScheme',
        identifier: `programme-${eventId}`,
        'aria-label': 'Add to calendar',
      })}
      <a className="programme-calendar-fallback" href={calendarUrl} download={`${eventId}.ics`} aria-label={`Download calendar file for ${title}`}>
        <Download aria-hidden="true" className="h-3.5 w-3.5" />
        <span>ICS</span>
      </a>
      <span className="sr-only">Add to calendar. Calendar entries are snapshots and will not automatically update if the schedule changes.</span>
      <CalendarPlus aria-hidden="true" className="sr-only" />
    </div>
  )
}
