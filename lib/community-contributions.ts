import { z } from 'zod'

export const CONTRIBUTION_AREAS = [
  { value: 'tech-and-it', label: 'Tech and IT' },
  { value: 'programs', label: 'Programs' },
  { value: 'partnership-team', label: 'Partnership team' },
  { value: 'talent-management', label: 'Talent management' },
  { value: 'publicity', label: 'Publicity' },
  { value: 'impact-series', label: 'Impact series' },
] as const

export const contributionSchema = z.object({
  campaign: z.enum(['volunteer', 'give-back']),
  kind: z.enum(['cash', 'services']),
  name: z.string().trim().min(2).max(120),
  // Members choose the team or programme they want to support before adding details.
  // Keep this optional at the API boundary so older clients can still submit.
  area: z.string().trim().max(40).optional().default(''),
  // Context helps the team review a contribution, but members can continue
  // without writing a long description.
  details: z.string().trim().max(3000).optional().default(''),
  amount: z.string().max(20).optional(),
  currency: z.string().trim().max(3).optional(),
  consent: z.literal(true),
}).superRefine((value, ctx) => {
  if (value.kind === 'cash' && (!value.amount || !/^\d+(\.\d{1,2})?$/.test(value.amount) || Number(value.amount) <= 0 || Number(value.amount) > 1000000000)) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter a valid positive pledge amount.' })
  if (value.kind === 'cash' && (!value.currency || !/^[A-Z]{3}$/.test(value.currency) || !Intl.supportedValuesOf('currency').includes(value.currency))) ctx.addIssue({ code: 'custom', path: ['currency'], message: 'Choose a currency.' })
})
