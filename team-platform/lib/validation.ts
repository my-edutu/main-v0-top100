import { z } from 'zod'

export const CHANNELS = ['call', 'whatsapp', 'email'] as const
export const OUTCOMES = [
  'no_answer',
  'number_unavailable',
  'message_sent',
  'awaiting_response',
  'interested',
  'payment_reported',
  'payment_verified',
  'not_interested',
  'followup_scheduled',
  'email_sent',
  'email_failed',
  'other',
] as const

export const followupSchema = z.object({
  awardeeId: z.string().uuid(),
  channel: z.enum(CHANNELS),
  outcome: z.enum(OUTCOMES),
  notes: z.string().trim().max(4000).optional().default(''),
  responded: z.boolean().default(false),
  paymentExpected: z.boolean().default(false),
  contactedAt: z.string().datetime().optional(),
  nextFollowupAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date')
    .nullable()
    .optional(),
})

export const emailSendSchema = z.object({
  awardeeId: z.string().uuid(),
  templateId: z.string().uuid().nullable().optional(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20_000),
  idempotencyKey: z.string().trim().min(8).max(120),
})

export const withdrawalSchema = z.object({
  amountMinor: z.number().int().positive(),
  currency: z.enum(['NGN', 'USD']).default('NGN'),
  payoutMethod: z.enum(['bank_transfer', 'paystack', 'other']),
  payoutDetails: z.record(z.string().trim().max(300)).default({}),
  idempotencyKey: z.string().trim().min(8).max(120),
})

export const withdrawalTransitionSchema = z.object({
  action: z.enum(['review', 'approve', 'reject', 'process', 'pay', 'cancel']),
  note: z.string().trim().max(2000).optional().default(''),
  reference: z.string().trim().max(200).optional().default(''),
  paidAmountMinor: z.number().int().positive().optional(),
})

export const assignmentSchema = z.object({
  limit: z.number().int().min(1).max(5000).default(1000),
  country: z.string().trim().max(80).default('Nigeria'),
  includePending: z.boolean().default(false),
})

export const reassignSchema = z.object({
  awardeeId: z.string().uuid(),
  agentId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
})

export const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(['agent', 'team_leader', 'super_admin']).default('agent'),
  phone: z.string().trim().max(40).optional().default(''),
})

export const settingsSchema = z.object({
  assignmentStrategy: z.enum(['least_loaded', 'round_robin']),
  autoAssignEnabled: z.boolean(),
  defaultCountry: z.string().trim().min(2).max(80),
  withdrawalMinMinor: z.number().int().min(0),
  withdrawalMaxMinor: z.number().int().min(0),
  commissionHoldHours: z.number().int().min(0).max(2160),
  senderName: z.string().trim().min(2).max(120),
  senderEmail: z.string().email().or(z.literal('')),
})

export const commissionRuleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  paymentCurrency: z.enum(['NGN', 'USD']),
  commissionCurrency: z.enum(['NGN', 'USD']).default('NGN'),
  commissionAmountMinor: z.number().int().positive(),
  countryScope: z.string().trim().max(80).nullable().optional(),
  priority: z.number().int().min(0).max(1000).default(0),
  isActive: z.boolean().default(true),
})

export const templateSchema = z.object({
  id: z.string().uuid().optional(),
  channel: z.enum(['whatsapp', 'email']),
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(10).max(20_000),
  isActive: z.boolean().default(true),
})

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().default(''),
})

export const noteSchema = z.object({
  notes: z.string().trim().max(4000).optional().default(''),
})

export const notificationReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(200).optional(),
  all: z.boolean().default(false),
})

export const importRemapSchema = z.object({
  jobId: z.string().uuid(),
  mapping: z.record(z.string().trim().max(120).nullable()),
})

export const importCommitSchema = z.object({
  jobId: z.string().uuid(),
})

export const commissionRuleUpdateSchema = commissionRuleSchema.extend({
  id: z.string().uuid(),
})

export const templateUpdateSchema = templateSchema.extend({
  id: z.string().uuid(),
})
