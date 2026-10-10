import { AFL_2026_CALENDAR } from './afl-2026-calendar'

export type LiveCalendarEvent = {
  id: string
  title: string
  startAt: string
  endAt: string
  meetUrl: string | null
  cover: string | null
}

const calendarId = 'c_49723456ee568795051f3fc2ced0b8ae4972bc67f5b4f73b578072979e23e298@group.calendar.google.com'
export const AFL_2026_ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

function decodeHtml(value: string): string {
  return value.replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function calendarDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value)
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z` : null
}

export function parseAflCalendar(ics: string): LiveCalendarEvent[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '').replace(/\r\n/g, '\n')
  const events: LiveCalendarEvent[] = []
  for (const block of unfolded.split('BEGIN:VEVENT').slice(1)) {
    const content = block.split('END:VEVENT')[0]
    const fields = new Map<string, string>()
    for (const line of content.split('\n')) {
      const colon = line.indexOf(':')
      if (colon < 0) continue
      const key = line.slice(0, colon).split(';')[0].trim()
      if (!fields.has(key)) fields.set(key, line.slice(colon + 1).trim())
    }
    const id = fields.get('UID')
    const startAt = calendarDate(fields.get('DTSTART') ?? '')
    const endAt = calendarDate(fields.get('DTEND') ?? '')
    if (!id || !startAt || !endAt || !fields.get('SUMMARY')) continue
    const description = unescapeIcs(fields.get('DESCRIPTION') ?? '')
    const sessionTitle = /<strong>Session:<\/strong>\s*<br\s*\/?>(?:\s*<strong>)?([^<]+)/i.exec(description)?.[1]
    const title = sessionTitle ? decodeHtml(sessionTitle) : unescapeIcs(fields.get('SUMMARY') ?? '')
    const conference = fields.get('X-GOOGLE-CONFERENCE')
    const descriptionMeet = /https:\/\/meet\.google\.com\/[a-z-]+/i.exec(description)?.[0]
    const meetUrl = [conference, descriptionMeet].find(url => url && /^https:\/\/meet\.google\.com\/[a-z-]+$/i.test(url)) ?? null
    events.push({
      id,
      title,
      startAt,
      endAt,
      meetUrl,
      cover: /onboarding/i.test(fields.get('SUMMARY') ?? '') ? AFL_2026_CALENDAR.artwork : null,
    })
  }
  return events.sort((left, right) => left.startAt.localeCompare(right.startAt))
}
