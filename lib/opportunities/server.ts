// lib/opportunities/server.ts
// Server-only helpers for the member-only opportunities store: the single
// visibility-tier authority, the row mapper, the zod schemas, and the
// missing-table degradation helpers.
//
// Never import into a client component — use lib/opportunities/client.ts or
// lib/opportunities/types.ts there.
import { z } from 'zod'

import type { createAdminClient } from '@/lib/supabase/server'
import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_VISIBILITIES,
  isDeadlinePast,
  nextAvailableSlug,
  slugify,
  type Opportunity,
  type OpportunityStatus,
  type OpportunityVisibility,
} from '@/lib/opportunities/types'

export const OPPORTUNITIES_SETUP_MESSAGE =
  'The opportunities database is not set up yet. Ask the admin to run supabase/migrations/20260728_opportunities.sql.'

/** True when the failure is "the migration has not been run yet". */
export function isMissingOpportunityTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.code === '42P01') return true
  return /relation .*(opportunities|opportunity_saves).* does not exist|schema cache/i.test(error.message ?? '')
}

// ---------------------------------------------------------------------------
// Visibility — the single source of truth
// ---------------------------------------------------------------------------

/**
 * The visibility tiers a caller is allowed to read. THIS IS THE ONLY PLACE the
 * tier rule lives: every read path must call it and apply the result as a
 * server-side `.in('visibility', tiers)` filter. A visibility filter must never
 * be accepted from the client, and rows must never be fetched broadly and then
 * filtered in JS — that is how "exclusive" listings leak.
 *
 * - no session          -> ['public']
 * - signed-in member    -> ['public', 'members']
 * - approved awardee    -> ['public', 'members', 'approved']
 *
 * `status` is the member's membership status (profiles.membership_status,
 * surfaced as MemberProfile.status). Anything other than the literal
 * 'approved' is treated as not approved — pending, rejected and suspended
 * members must not see approved-tier listings.
 */
export function visibleTiersFor(member: { status?: string | null } | null | undefined): OpportunityVisibility[] {
  if (!member) return ['public']
  if (member.status === 'approved') return ['public', 'members', 'approved']
  return ['public', 'members']
}

/**
 * Reads the caller's membership status for visibleTiersFor().
 *
 * `profiles.membership_status` is added by supabase/SETUP-MEMBER-HUB.sql and is
 * genuinely absent on databases where that has not been run. When the column
 * (or the row) cannot be read we return `undefined`, which visibleTiersFor()
 * resolves to the *least* privileged member tier. Failing closed matters: a
 * member whose status cannot be determined must never be handed the
 * approved-only listings.
 */
export async function loadMemberStatus(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | undefined> {
  const { data, error } = await supabase
    .from('profiles')
    .select('membership_status')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[member-opportunities] could not read membership_status', error)
    return undefined
  }
  const status = (data as { membership_status?: string } | null)?.membership_status
  return typeof status === 'string' ? status : undefined
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

export const OPPORTUNITY_COLUMNS =
  'id, title, slug, type, organization, location, summary, description, application_url, contact_email, deadline, amount_note, visibility, is_featured, status, created_at, updated_at'

export function mapOpportunity(row: any, isSaved = false): Opportunity {
  return {
    id: row.id,
    title: row.title ?? '',
    slug: row.slug ?? '',
    type: row.type ?? 'Programme',
    organization: row.organization ?? null,
    location: row.location ?? null,
    summary: row.summary ?? null,
    description: row.description ?? null,
    applicationUrl: row.application_url ?? null,
    contactEmail: row.contact_email ?? null,
    deadline: row.deadline ?? null,
    amountNote: row.amount_note ?? null,
    visibility: (row.visibility ?? 'members') as OpportunityVisibility,
    isFeatured: Boolean(row.is_featured),
    status: (row.status ?? 'draft') as OpportunityStatus,
    isSaved,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  }
}

/**
 * Member-facing ordering: featured first, then soonest deadline, with undated
 * ("Rolling") listings last. Anything already past its deadline sinks to the
 * bottom rather than disappearing — a member who bookmarked it should still
 * find it, clearly marked "Closed".
 *
 * This only *reorders* an already server-filtered set; it never filters.
 */
export function sortForMember(rows: Opportunity[], now: Date = new Date()): Opportunity[] {
  return [...rows].sort((a, b) => {
    const expiredA = isDeadlinePast(a.deadline, now) ? 1 : 0
    const expiredB = isDeadlinePast(b.deadline, now) ? 1 : 0
    if (expiredA !== expiredB) return expiredA - expiredB
    if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1
    if (a.deadline !== b.deadline) {
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline < b.deadline ? -1 : 1
    }
    return a.title.localeCompare(b.title)
  })
}

/**
 * PostgREST's `or=` filter is a comma/parenthesis-delimited mini-language, so a
 * raw search term containing those characters would change the filter's shape.
 * Strip them (plus the LIKE wildcards) before interpolating.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()%*\\"']/g, ' ').trim().slice(0, 80)
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

/**
 * A unique slug for `title`, suffixed if the base is already taken.
 * Returns `{ slug }` or `{ error }` if the existing-slug lookup failed.
 */
export async function buildUniqueSlug(
  supabase: ReturnType<typeof createAdminClient>,
  title: string,
): Promise<{ slug?: string; error?: { code?: string; message?: string } }> {
  const base = slugify(title)
  const { data, error } = await supabase
    .from('opportunities')
    .select('slug')
    .like('slug', `${base}%`)

  if (error) return { error }

  const taken = (data ?? []).map((row: { slug: string }) => row.slug)
  return { slug: nextAvailableSlug(base, taken) }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null))

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine((value) => value === null || /^https?:\/\/\S+$/i.test(value), {
    message: 'Application link must be a http(s) URL.',
  })

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value.toLowerCase() : null))
  .refine((value) => value === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: 'Contact email must be a valid email address.',
  })

const optionalDeadline = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null))
  .refine((value) => value === null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))), {
    message: 'Deadline must be a valid date (YYYY-MM-DD).',
  })

export const createOpportunitySchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(200),
  type: z.enum(OPPORTUNITY_TYPES),
  organization: optionalText(200),
  location: optionalText(200),
  summary: optionalText(500),
  description: optionalText(20000),
  applicationUrl: optionalUrl,
  contactEmail: optionalEmail,
  deadline: optionalDeadline,
  amountNote: optionalText(200),
  visibility: z.enum(OPPORTUNITY_VISIBILITIES).default('members'),
  isFeatured: z.boolean().default(false),
  status: z.enum(OPPORTUNITY_STATUSES).default('draft'),
})

export const updateOpportunitySchema = createOpportunitySchema.partial()

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>

/**
 * The publish gate. A published opportunity with no way to apply is the most
 * common failure mode here, so publishing requires a title, a type, and at
 * least one of an application URL or a contact email.
 *
 * Returns an error message, or null when the row may be published.
 */
export function publishBlockedReason(fields: {
  title?: string | null
  type?: string | null
  applicationUrl?: string | null
  contactEmail?: string | null
}): string | null {
  if (!fields.title || fields.title.trim().length < 3) {
    return 'A published opportunity needs a title.'
  }
  if (!fields.type || fields.type.trim().length === 0) {
    return 'A published opportunity needs a type.'
  }
  const hasApplyPath =
    (fields.applicationUrl && fields.applicationUrl.trim().length > 0) ||
    (fields.contactEmail && fields.contactEmail.trim().length > 0)
  if (!hasApplyPath) {
    return 'A published opportunity needs an application link or a contact email, otherwise nobody can apply.'
  }
  return null
}

/**
 * Rejects a deadline that has already passed. Applied on create only — a
 * listing that is already closed helps nobody. Undated listings are fine.
 */
export function deadlineRejectionReason(deadline: string | null, now: Date = new Date()): string | null {
  if (!deadline) return null
  if (Number.isNaN(Date.parse(deadline))) return 'Deadline must be a valid date (YYYY-MM-DD).'
  if (isDeadlinePast(deadline, now)) return 'That deadline is already in the past.'
  return null
}

/** camelCase input -> snake_case row patch, omitting keys the caller left out. */
export function toRowPatch(input: UpdateOpportunityInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.type !== undefined) patch.type = input.type
  if (input.organization !== undefined) patch.organization = input.organization
  if (input.location !== undefined) patch.location = input.location
  if (input.summary !== undefined) patch.summary = input.summary
  if (input.description !== undefined) patch.description = input.description
  if (input.applicationUrl !== undefined) patch.application_url = input.applicationUrl
  if (input.contactEmail !== undefined) patch.contact_email = input.contactEmail
  if (input.deadline !== undefined) patch.deadline = input.deadline
  if (input.amountNote !== undefined) patch.amount_note = input.amountNote
  if (input.visibility !== undefined) patch.visibility = input.visibility
  if (input.isFeatured !== undefined) patch.is_featured = input.isFeatured
  if (input.status !== undefined) patch.status = input.status
  return patch
}
