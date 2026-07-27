// lib/opportunities/types.ts
// Shared, dependency-free opportunity types and display helpers.
// Safe to import from client components, server routes and tests alike.

export const OPPORTUNITY_VISIBILITIES = ['public', 'members', 'approved'] as const
export type OpportunityVisibility = (typeof OPPORTUNITY_VISIBILITIES)[number]

export const OPPORTUNITY_STATUSES = ['draft', 'published', 'closed', 'archived'] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]

export const OPPORTUNITY_TYPES = [
  'Scholarship',
  'Fellowship',
  'Grant',
  'Internship',
  'Job',
  'Mentorship',
  'Programme',
] as const
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number]

/** The API shape of one opportunity row. `isSaved` is per-caller. */
export type Opportunity = {
  id: string
  title: string
  slug: string
  type: string
  organization: string | null
  location: string | null
  summary: string | null
  description: string | null
  applicationUrl: string | null
  contactEmail: string | null
  deadline: string | null
  amountNote: string | null
  visibility: OpportunityVisibility
  isFeatured: boolean
  status: OpportunityStatus
  isSaved: boolean
  createdAt: string
  updatedAt: string
}

export const VISIBILITY_LABELS: Record<OpportunityVisibility, string> = {
  public: 'Public',
  members: 'Members only',
  approved: 'Approved awardees',
}

export const STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  closed: 'Closed',
  archived: 'Archived',
}

/**
 * Midnight-UTC timestamp for a calendar day, so a `date` column ("2026-08-01")
 * and "today" are compared as days, never as instants. `now` is read through
 * its *local* components on purpose: a member in Lagos should see "Closes
 * today" on the Lagos calendar day, not the UTC one.
 */
function dayNumber(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())
}

function parseDeadlineDay(deadline: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(deadline.trim())
  if (!match) {
    const parsed = new Date(deadline)
    return Number.isNaN(parsed.getTime()) ? null : dayNumber(parsed)
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** Whole days from `now` until `deadline`. Negative once the day has passed. */
export function daysUntilDeadline(deadline: string | null | undefined, now: Date = new Date()): number | null {
  if (!deadline) return null
  const target = parseDeadlineDay(deadline)
  if (target === null) return null
  return Math.round((target - dayNumber(now)) / 86_400_000)
}

/** "Closes in 6 days" / "Closes tomorrow" / "Closes today" / "Closed" / "Rolling". */
export function formatDeadlineCountdown(deadline: string | null | undefined, now: Date = new Date()): string {
  const days = daysUntilDeadline(deadline, now)
  if (days === null) return 'Rolling'
  if (days < 0) return 'Closed'
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  return `Closes in ${days} days`
}

/** True once the deadline day is behind us. Undated listings never expire. */
export function isDeadlinePast(deadline: string | null | undefined, now: Date = new Date()): boolean {
  const days = daysUntilDeadline(deadline, now)
  return days !== null && days < 0
}

/** Short human date for a `date` column, e.g. "1 Aug 2026". */
export function formatDeadlineDate(deadline: string | null | undefined): string {
  if (!deadline) return 'Rolling'
  const day = parseDeadlineDay(deadline)
  if (day === null) return 'Rolling'
  return new Date(day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** URL-safe slug base from a title. Never empty — falls back to 'opportunity'. */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
  return slug || 'opportunity'
}

/**
 * First free slug of the form `base`, `base-2`, `base-3`, ... given the slugs
 * already taken. Suffixing (rather than rejecting) keeps admins from having to
 * invent unique titles for two cohorts of the same programme.
 */
export function nextAvailableSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}
