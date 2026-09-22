import { validateProgrammeEventInput } from './programme'

export type CalendarEventInput = {
  id: string
  title: string
  summary: string | null
  description: string | null
  startAt: string
  endAt: string
  timezone: string
  meetingUrl: string | null
  speakerName: string | null
  reminderMinutes: number | null
}

export type CalendarEvent = {
  uid: string
  startAt: string
  endAt: string
  alarmTrigger: string | null
  ics: string
}

const escapeText = (value: string | null | undefined): string =>
  (value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/([,;])/g, '\\$1')

function calendarParts(value: string, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
}

function calendarTimestamp(value: string, timeZone: string): string {
  const parts = calendarParts(value, timeZone)
  return `${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}${parts.second}`
}

function alarmTrigger(reminderMinutes: number | null): string | null {
  if (!reminderMinutes) return null
  if (reminderMinutes === 1440) return '-P1D'
  if (reminderMinutes % 60 === 0) return `-PT${reminderMinutes / 60}H`
  return `-PT${reminderMinutes}M`
}

export function buildCalendarEvent(input: CalendarEventInput): CalendarEvent {
  validateProgrammeEventInput({ startAt: input.startAt, endAt: input.endAt })

  const uid = `${input.id}@top100afl.com`
  const startAt = calendarTimestamp(input.startAt, input.timezone)
  const endAt = calendarTimestamp(input.endAt, input.timezone)
  const trigger = alarmTrigger(input.reminderMinutes)
  const description = [input.description ?? input.summary, input.speakerName ? `Speaker: ${input.speakerName}` : null]
    .filter(Boolean)
    .join('\n\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Top100 Africa Future Leaders//Programme//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-TIMEZONE:${input.timezone}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${calendarTimestamp(new Date().toISOString(), 'UTC')}Z`,
    `DTSTART;TZID=${input.timezone}:${startAt}`,
    `DTEND;TZID=${input.timezone}:${endAt}`,
    `SUMMARY:${escapeText(input.title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    ...(input.meetingUrl ? [`URL:${input.meetingUrl}`, `LOCATION:${escapeText(input.meetingUrl)}`] : []),
    ...(trigger ? [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `TRIGGER:${trigger}`,
      `DESCRIPTION:${escapeText(input.title)}`,
      'END:VALARM',
    ] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return { uid, startAt, endAt, alarmTrigger: trigger, ics: `${lines.join('\r\n')}\r\n` }
}

export function toICS(input: CalendarEventInput): string {
  return buildCalendarEvent(input).ics
}
