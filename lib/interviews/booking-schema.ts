import { z } from 'zod'
export const interviewRequestSchema = z.object({
  topic: z.string().trim().min(10).max(160),
  impactStory: z.string().trim().min(80).max(2000),
  format: z.enum(['video','written','either']),
  timezone: z.string().min(1).max(80).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false } }),
  preferredWindows: z.array(z.string().trim().max(100)).max(5).default([]),
  additionalNote: z.string().trim().max(500).default(''),
  publicationConsent: z.literal(true),
})
export const bookingActionSchema = z.object({ action:z.enum(['accept','request_change','member_cancel']), revision:z.number().int().nonnegative(), reason:z.string().trim().max(500).optional() })
export const adminBookingActionSchema = z.object({ applicationId:z.string().uuid(), action:z.enum(['approve','decline','propose','reschedule','admin_cancel','complete']), revision:z.number().int().nonnegative().optional(), startsAt:z.string().datetime({offset:true}).optional(), meetingUrl:z.string().url().max(500).optional(), reason:z.string().trim().max(500).optional() }).superRefine((value, context) => {
  if (['decline','reschedule','admin_cancel'].includes(value.action) && (value.reason?.trim().length ?? 0) < 8) {
    context.addIssue({ code:'custom', path:['reason'], message:'Add a short reason for this update.' })
  }
  if (['propose','reschedule'].includes(value.action) && !value.startsAt) {
    context.addIssue({ code:'custom', path:['startsAt'], message:'Choose an interview time.' })
  }
})
