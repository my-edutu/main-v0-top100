import { PROGRAMME_ARTWORK } from '@/lib/events/programme-artwork'
import { formatProgrammeDate } from '@/lib/events/programme'
import type { LiveCalendarEvent } from '@/lib/events/live-calendar'
import { getSpeaker } from '@/lib/speakers'

export type SessionResourceType = 'video' | 'presentation' | 'workshop' | 'writeup'

export interface SessionResource {
  title: string
  type: SessionResourceType
  url: string
  description?: string
  presenter?: string
}

export interface Session {
  slug: string
  year: number
  title: string
  presenter?: string
  date?: string
  coverImage?: string
  locked?: boolean
  summary?: string
  featured?: boolean
  resources: SessionResource[]
}

export const archiveYears = [2024, 2025, 2026] as const

const umunna = getSpeaker('odinakachi-umunna')

const availableSessions: Session[] = [
  {
    slug: '2026-onboarding',
    year: 2026,
    title: 'Africa Future Leaders 2026: Cohort Onboarding',
    presenter: 'Emmanuella Igboafu',
    coverImage: PROGRAMME_ARTWORK[0]?.src,
    summary: 'A welcome to the cohort, the October programme, and the leadership journey ahead.',
    featured: true,
    resources: [],
  },
  {
    slug: '2026-day-1',
    year: 2026,
    title: 'Beyond the Paycheck: How to Build Valuable Skills, Increase Your Earning Power and Create Financial Options Early in Your Career',
    presenter: umunna?.name ?? 'Odinakachi Umunna',
    coverImage: umunna?.portrait,
    summary: 'Explore how to build valuable skills, increase your earning power, and create more financial options early in your career.',
    featured: true,
    resources: [],
  },
]

const artworkByTopic: Array<{ pattern: RegExp; sessionNumber: number }> = [
  { pattern: /beyond the paycheck/i, sessionNumber: 2 },
  { pattern: /from idea to scale|from problem to product/i, sessionNumber: 9 },
  { pattern: /opportunity builder|employability advantage/i, sessionNumber: 1 },
  { pattern: /succeeding in the ai era/i, sessionNumber: 6 },
  { pattern: /from knowledge to impact/i, sessionNumber: 7 },
  { pattern: /collaboration advantage/i, sessionNumber: 8 },
]

function getTopicArtwork(title: string): string | undefined {
  const match = artworkByTopic.find(({ pattern }) => pattern.test(title))
  return match ? PROGRAMME_ARTWORK[match.sessionNumber]?.src : undefined
}

function getAttachmentResource(attachment: NonNullable<LiveCalendarEvent['attachments']>[number]): SessionResource | undefined {
  const mimeType = attachment.mimeType?.toLowerCase() ?? ''
  const filename = attachment.title.toLowerCase()
  const type: SessionResourceType | undefined = mimeType.startsWith('video/') || /recording|video/.test(filename)
    ? 'video'
    : /presentation|slides|\.pdf$/.test(filename) || mimeType === 'application/pdf'
      ? 'presentation'
      : /workshop|template|exercise/.test(filename)
        ? 'workshop'
        : /chat|notes|transcript|document/.test(filename) || mimeType.startsWith('text/') || mimeType.includes('google-apps.document')
          ? 'writeup'
          : undefined
  if (!type) return undefined

  const title = type === 'video'
    ? 'Session recording'
    : type === 'writeup' && /chat/i.test(attachment.title)
      ? 'Session chat'
      : attachment.title.replace(/\s+-\s+\d{4}\/.*$/, '').trim()

  return { title, type, url: attachment.url }
}

function toArchiveSession(event: LiveCalendarEvent): Session {
  const isOnboarding = /awardee onboarding/i.test(event.title)
  const isUmunnaSession = /^beyond the paycheck:/i.test(event.title)
  const available = isOnboarding
    ? availableSessions[0]
    : isUmunnaSession
      ? availableSessions[1]
      : undefined

  return {
    ...(available ?? {
      slug: `locked-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
      year: 2026,
      resources: [],
    }),
    // The archive title follows the member-facing programme event title.
    title: isOnboarding ? 'Africa Future Leaders 2026: Cohort Onboarding' : event.title,
    date: formatProgrammeDate(event.startAt),
    coverImage: event.cover ?? available?.coverImage ?? getTopicArtwork(event.title),
    presenter: isOnboarding ? 'Emmanuella Igboafu' : isUmunnaSession ? (umunna?.name ?? 'Odinakachi Umunna') : undefined,
    resources: (event.attachments ?? []).map(getAttachmentResource).filter((resource): resource is SessionResource => Boolean(resource)),
    locked: !available,
  }
}

export function getSessionBySlug(slug: string): Session | undefined {
  return availableSessions.find((session) => session.slug === slug)
}

export function getSessionsByYear(calendarEvents: LiveCalendarEvent[] = []): Array<{ year: number; sessions: Session[] }> {
  const currentSessions = calendarEvents.length > 0
    ? calendarEvents
      .filter((event) => event.title.trim().length > 0)
      .filter((event, index, all) => all.findIndex((candidate) => candidate.title === event.title) === index)
      .map(toArchiveSession)
    : availableSessions
  const years = new Set<number>([...archiveYears, ...currentSessions.map((session) => session.year)])

  return [...years]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      sessions: currentSessions.filter((session) => session.year === year),
    }))
}
