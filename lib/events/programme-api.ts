import type { ReminderMinutes } from './programme'
import { PROGRAMME_LABEL } from './programme'

export type ProgrammeSpeaker = {
  id: string
  slug: string
  name: string
  portraitUrl: string | null
  role: string | null
  organisation: string | null
  biography: string | null
  websiteUrl: string | null
  linkedinUrl: string | null
  socialUrl: string | null
  status: 'draft' | 'published' | 'archived'
}

export type MemberProgrammeEvent = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  location: string | null
  startAt: string | null
  endAt: string | null
  registrationUrl: string | null
  registrationLabel: string
  featuredImageUrl: string | null
  status: string | null
  visibility: string | null
  programmeLabel: string | null
  sessionNumber: number | null
  learningOutcomes: string[]
  timezone: string
  reminderMinutes: ReminderMinutes | null
  calendarUrl: string
  speaker: ProgrammeSpeaker | null
}

export type AdminProgrammeEvent = MemberProgrammeEvent & {
  isVirtual: boolean
  city: string | null
  country: string | null
  tags: string[]
  capacity: number | null
  isFeatured: boolean
  speakerId: string | null
}

export function isAfricaFutureLeadersProgrammeEvent(row: { programme_label?: string | null; session_number?: number | null }): boolean {
  return row.programme_label === PROGRAMME_LABEL && typeof row.session_number === 'number' && row.session_number >= 0 && row.session_number <= 10
}

type SpeakerRow = Partial<{
  id: string
  slug: string
  name: string
  portrait_url: string | null
  role: string | null
  organisation: string | null
  biography: string | null
  website_url: string | null
  linkedin_url: string | null
  social_url: string | null
  status: 'draft' | 'published' | 'archived'
}>

type EventRow = Partial<{
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string | null
  description: string | null
  location: string | null
  city: string | null
  country: string | null
  is_virtual: boolean
  start_at: string | null
  end_at: string | null
  registration_url: string | null
  registration_label: string | null
  featured_image_url: string | null
  status: string | null
  visibility: string | null
  programme_label: string | null
  session_number: number | null
  learning_outcomes: unknown
  timezone: string | null
  reminder_minutes: number | null
  speaker_id: string | null
  tags: unknown
  capacity: number | null
  is_featured: boolean
  speaker: SpeakerRow | SpeakerRow[] | null
}>

const first = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null

const speakerProjection = (value: SpeakerRow | SpeakerRow[] | null | undefined, includeUnpublished: boolean): ProgrammeSpeaker | null => {
  const speaker = first(value)
  if (!speaker?.id || !speaker.name || !speaker.status) return null
  if (!includeUnpublished && speaker.status !== 'published') return null

  return {
    id: speaker.id,
    slug: speaker.slug ?? speaker.id,
    name: speaker.name,
    portraitUrl: speaker.portrait_url ?? null,
    role: speaker.role ?? null,
    organisation: speaker.organisation ?? null,
    biography: speaker.biography ?? null,
    websiteUrl: speaker.website_url ?? null,
    linkedinUrl: speaker.linkedin_url ?? null,
    socialUrl: speaker.social_url ?? null,
    status: speaker.status,
  }
}

const learningOutcomes = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()) : []

const reminder = (value: unknown): ReminderMinutes | null =>
  value === 15 || value === 30 || value === 60 || value === 1440 ? value : null

export function toMemberProgrammeEvent(row: EventRow): MemberProgrammeEvent {
  const fallbackLocation = [text(row.city), text(row.country)].filter(Boolean).join(', ')
  return {
    id: row.id ?? '',
    slug: row.slug ?? '',
    title: row.title ?? 'Untitled event',
    subtitle: text(row.subtitle),
    summary: text(row.summary),
    description: text(row.description),
    location: text(row.location) ?? (fallbackLocation || null),
    startAt: row.start_at ?? null,
    endAt: row.end_at ?? null,
    registrationUrl: text(row.registration_url),
    registrationLabel: text(row.registration_label) ?? 'Event details',
    featuredImageUrl: text(row.featured_image_url),
    status: row.status ?? null,
    visibility: row.visibility ?? null,
    programmeLabel: text(row.programme_label),
    sessionNumber: typeof row.session_number === 'number' ? row.session_number : null,
    learningOutcomes: learningOutcomes(row.learning_outcomes),
    timezone: text(row.timezone) ?? 'Africa/Lagos',
    reminderMinutes: reminder(row.reminder_minutes),
    calendarUrl: row.id ? `/api/events/${row.id}/calendar.ics` : '',
    speaker: speakerProjection(row.speaker, false),
  }
}

export function toAdminProgrammeEvent(row: EventRow): AdminProgrammeEvent {
  return {
    ...toMemberProgrammeEvent(row),
    isVirtual: Boolean(row.is_virtual),
    city: row.city ?? null,
    country: row.country ?? null,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    capacity: typeof row.capacity === 'number' ? row.capacity : null,
    isFeatured: Boolean(row.is_featured),
    speakerId: row.speaker_id ?? null,
    speaker: speakerProjection(row.speaker, true),
  }
}

export function toMemberEventRow(row: EventRow): Record<string, unknown> {
  const projected = toMemberProgrammeEvent(row)
  return {
    ...row,
    programme_label: projected.programmeLabel,
    session_number: projected.sessionNumber,
    learning_outcomes: projected.learningOutcomes,
    timezone: projected.timezone,
    reminder_minutes: projected.reminderMinutes,
    calendar_url: projected.calendarUrl,
    speaker: projected.speaker,
    programme_speakers: undefined,
  }
}
