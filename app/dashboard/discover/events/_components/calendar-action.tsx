import { ArrowUpRight, CalendarPlus } from 'lucide-react'
import { AFL_2026_CALENDAR } from '@/lib/events/afl-2026-calendar'

type Props = {
  eventId: string
  title: string
  startAt: string | null
  endAt: string | null
  timezone: string
  meetingUrl: string | null
  calendarUrl: string
}

export function CalendarAction({ startAt, endAt }: Props) {
  if (!startAt || !endAt) return null

  return (
    <div className="programme-calendar-action" onClick={(event) => event.stopPropagation()}>
      <a className="programme-calendar-primary" href={AFL_2026_CALENDAR.addUrl} target="_blank" rel="noopener noreferrer" aria-label="Add the Africa Future Leaders 2026 event calendar to Google Calendar">
        <CalendarPlus aria-hidden="true" className="h-4 w-4" />
        <span>Add full calendar</span>
      </a>
      <a className="programme-calendar-fallback" href={AFL_2026_CALENDAR.viewUrl} target="_blank" rel="noopener noreferrer" aria-label="View the Africa Future Leaders 2026 event calendar">
        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        <span>View schedule</span>
      </a>
    </div>
  )
}
