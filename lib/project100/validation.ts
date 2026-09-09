import { z } from 'zod'

import type {
  Project100Application,
  Project100ApplicationDraft,
  Project100ApplicationRow,
  Project100Schedule,
  Project100ScheduleRow,
} from './types'

export const PROJECT100_DEFAULT_APPLICATION_DEADLINE = '2026-11-07T23:59:59.000Z'
export const PROJECT100_DEFAULT_KICKOFF_AT = '2027-01-01T00:00:00.000Z'

const optionalText = (max: number) => z.string().trim().max(max).optional()
const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max)

export function normalizeProject100Phone(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const compact = trimmed.replace(/[\s().-]/g, '')
  const international = compact.startsWith('00') ? `+${compact.slice(2)}` : compact
  if (!/^\+[1-9]\d{6,14}$/.test(international)) return undefined
  return international
}

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .refine(value => !value || Boolean(normalizeProject100Phone(value)), 'Use an international phone number.')
  .transform(value => (value ? normalizeProject100Phone(value) : undefined))

export const project100DraftSchema = z
  .object({
    fullName: optionalText(160),
    phone: optionalPhone,
    country: optionalText(100),
    location: optionalText(160),
    interest: optionalText(500),
    areaOfFunction: optionalText(160),
    teamLeadPreference: z.boolean().optional(),
    resourceSupportNeeds: optionalText(2_000),
    consent: z.boolean().optional(),
  })
  .strict()

export const project100SubmissionSchema = z
  .object({
    fullName: requiredText('Name', 160),
    phone: z.string().transform((value, ctx) => {
      const normalized = normalizeProject100Phone(value)
      if (!normalized) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use an international phone number.' })
        return z.NEVER
      }
      return normalized
    }),
    country: requiredText('Country', 100),
    location: requiredText('Location', 160),
    interest: requiredText('Interest', 500),
    areaOfFunction: requiredText('Area of function', 160),
    teamLeadPreference: z.boolean({ required_error: 'Choose your team-lead preference.' }),
    resourceSupportNeeds: requiredText('Resource or support needs', 2_000),
    consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required.' }) }),
  })
  .strict()

const isoTimestamp = z.string().trim().refine(value => !Number.isNaN(Date.parse(value)), 'Use a valid date and time.')

export const project100ScheduleSchema = z
  .object({
    applicationDeadline: isoTimestamp,
    kickoffAt: isoTimestamp,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Date.parse(value.kickoffAt) < Date.parse(value.applicationDeadline)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['kickoffAt'], message: 'Kickoff must be after the application deadline.' })
    }
  })

export function normalizeProject100Draft(input: unknown): Partial<Project100ApplicationDraft> {
  return project100DraftSchema.parse(input)
}

export function normalizeProject100Schedule(input: unknown): Pick<Project100Schedule, 'applicationDeadline' | 'kickoffAt'> {
  const schedule = project100ScheduleSchema.parse(input)
  return {
    applicationDeadline: new Date(schedule.applicationDeadline).toISOString(),
    kickoffAt: new Date(schedule.kickoffAt).toISOString(),
  }
}

export function serializeProject100Application(row: Project100ApplicationRow): Project100Application {
  return {
    id: row.id,
    memberId: row.member_id,
    status: row.status,
    fullName: row.full_name,
    phone: row.phone,
    country: row.country,
    location: row.location,
    interest: row.interest,
    areaOfFunction: row.area_of_function,
    teamLeadPreference: row.team_lead_preference,
    resourceSupportNeeds: row.resource_support_needs,
    consent: row.consent,
    consentedAt: row.consented_at,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function serializeProject100Schedule(row: Project100ScheduleRow): Project100Schedule {
  return {
    applicationDeadline: new Date(row.application_deadline).toISOString(),
    kickoffAt: new Date(row.kickoff_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}
