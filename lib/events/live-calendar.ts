import { AFL_2026_CALENDAR, AFL_2026_MEET_URL } from './afl-2026-calendar'
import { PROGRAMME_ARTWORK } from './programme-artwork'
import { PROGRAMME_SCHEDULE } from './programme'

export type LiveCalendarEvent = {
  id: string
  title: string
  startAt: string
  endAt: string
  meetUrl: string | null
  cover: string | null
  attachments?: LiveCalendarAttachment[]
}

export type LiveCalendarAttachment = {
  title: string
  url: string
  mimeType: string | null
}

const calendarId = 'c_49723456ee568795051f3fc2ced0b8ae4972bc67f5b4f73b578072979e23e298@group.calendar.google.com'
export const AFL_2026_ICS_URL = `https://calendar.google.com/calendar/ical/${encodeURIComponent(calendarId)}/public/basic.ics`

export async function loadAflCalendarEvents(): Promise<LiveCalendarEvent[]> {
  const response = await fetch(AFL_2026_ICS_URL, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`Google Calendar returned ${response.status}`)
  const events = parseAflCalendar(await response.text())
  if (!events.length) throw new Error('Google Calendar returned no events')
  return events
}

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
    const meetUrl = AFL_2026_MEET_URL
    const titleKey = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    const archiveCover = /bloom|world class opportunities/.test(titleKey)
      ? '/images/session-bloom-positioning.jpg'
      : /tech driven society|succeeding in the ai era/.test(titleKey)
        ? '/images/session-tech-driven-society.jpg'
        : /from idea to scale/.test(titleKey)
          ? '/images/session-from-idea-to-scale.jpg'
          : /from knowledge to impact/.test(titleKey)
            ? '/images/session-from-knowledge-to-impact.jpg'
            : /beyond the paycheck/.test(titleKey)
              ? '/images/session-beyond-the-paycheck.jpg'
              : null
    const programmeArtwork = PROGRAMME_SCHEDULE.find(item => {
      const scheduledTitle = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
      return titleKey.includes(scheduledTitle) || scheduledTitle.includes(titleKey)
    })
    const attachments = content.split('\n').flatMap((line): LiveCalendarAttachment[] => {
      const urlStart = line.indexOf('https://')
      if (urlStart < 1 || !line.startsWith('ATTACH')) return []
      const metadata = line.slice(0, urlStart).replace(/:$/, '')
      const filename = /(?:^|;)FILENAME="?([^";]*)"?/i.exec(metadata)?.[1]
      const mimeType = /(?:^|;)FMTTYPE=([^;]+)/i.exec(metadata)?.[1] ?? null
      const url = unescapeIcs(line.slice(urlStart).trim())
      if (!filename || !/^https:\/\//i.test(url)) return []
      return [{ title: unescapeIcs(filename), url, mimeType }]
    })
    events.push({
      id,
      title,
      startAt,
      endAt,
      meetUrl,
      cover: /onboarding/i.test(`${title} ${fields.get('SUMMARY') ?? ''}`)
        ? AFL_2026_CALENDAR.artwork
        : archiveCover ?? (programmeArtwork ? PROGRAMME_ARTWORK[programmeArtwork.sessionNumber]?.src ?? null : null),
      attachments,
    })
  }
  return events.sort((left, right) => left.startAt.localeCompare(right.startAt))
}
