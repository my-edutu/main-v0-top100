import { z } from 'zod'

export const contributionSchema = z.object({
  campaign: z.enum(['volunteer', 'give-back']),
  kind: z.enum(['cash', 'services']),
  name: z.string().trim().min(2).max(120),
  details: z.string().trim().min(20, 'Please add at least 20 characters.').max(3000),
  amount: z.string().max(20).optional(),
  currency: z.string().trim().max(3).optional(),
  consent: z.literal(true),
}).superRefine((value, ctx) => {
  if (value.kind === 'cash' && (!value.amount || !/^\d+(\.\d{1,2})?$/.test(value.amount) || Number(value.amount) <= 0 || Number(value.amount) > 1000000000)) ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Enter a valid positive pledge amount.' })
  if (value.kind === 'cash' && (!value.currency || !/^[A-Z]{3}$/.test(value.currency) || !Intl.supportedValuesOf('currency').includes(value.currency))) ctx.addIssue({ code: 'custom', path: ['currency'], message: 'Choose a currency.' })
})
