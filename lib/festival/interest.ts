import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import { z } from 'zod'
import type { AwardPaymentView } from '@/lib/awards/payment'

export const festivalInterestSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(150, 'Use 150 characters or fewer.'),
    phone: z
      .string()
      .trim()
      .max(40)
      .transform((value, ctx) => {
        const phone = value.startsWith('+')
          ? parsePhoneNumberFromString(value, { extract: false })
          : undefined
        if (!phone?.isValid()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Enter a valid phone number with country code, for example +2348031234567.',
          })
          return z.NEVER
        }
        return phone.number
      }),
    pickupRequested: z.boolean(),
  })
  .strict()

export type FestivalInterestInput = z.infer<typeof festivalInterestSchema>
export type FestivalInterest = FestivalInterestInput & { updatedAt: string }
export type FestivalPaymentState =
  'not_requested' | 'required' | 'pending' | 'confirmed' | 'unavailable'
export type FestivalInterestView = {
  interest: FestivalInterest | null
  payment: FestivalPaymentState
  ticket?: FestivalTicket | null
}
export type FestivalTicket = {
  id: string
  registeredAt: string
  emailStatus: 'pending' | 'sent' | 'failed' | 'preview'
}
export type FestivalInterestList = {
  interests: (FestivalInterest & { memberId: string; registeredAt?: string | null; ticketId?: string | null })[]
  total: number
  page: number
  pageSize: number
}

export function pickupPaymentState(
  payment: Pick<AwardPaymentView, 'status' | 'confirmedPayment'>,
): Exclude<FestivalPaymentState, 'not_requested'> {
  if (payment.status === 'paid')
    return payment.confirmedPayment ? 'confirmed' : 'unavailable'
  if (payment.status === 'pending') return 'pending'
  return 'required'
}

const festivalContactSchema = z.object({
  name: festivalInterestSchema.shape.fullName,
  email: z.string().trim().max(254).email('Enter a valid email address.'),
  phone: festivalInterestSchema.shape.phone,
}).strict()

export const festivalRsvpSchema = z.object({
  attending: z.boolean(),
  awardee: festivalContactSchema,
  guest: festivalContactSchema.nullable(),
  pickup: z.enum(['festival', 'dispatch']),
}).strict().superRefine((value, ctx) => {
  if (!value.attending && (value.guest || value.pickup === 'festival')) {
    ctx.addIssue({ code: 'custom', message: 'Guests and festival pickup require attendance.' })
  }
})

export const festivalDispatchSchema = z.object({
  recipient: festivalInterestSchema.shape.fullName,
  phone: festivalInterestSchema.shape.phone,
  country: z.string().trim().min(2, 'Enter a country.').max(100),
  city: z.string().trim().min(1, 'Enter a city.').max(100),
  region: z.string().trim().max(100),
  address: z.string().trim().min(4, 'Enter the street address.').max(300),
  postalCode: z.string().trim().max(24),
}).strict()

export type FestivalContact = z.infer<typeof festivalContactSchema>
export type FestivalRsvp = z.infer<typeof festivalRsvpSchema>
export type FestivalDispatch = z.infer<typeof festivalDispatchSchema>
export type FestivalResponse = {
  attending: boolean | null
  awardee: FestivalContact | null
  guest: FestivalContact | null
  pickup: FestivalRsvp['pickup']
  dispatch: FestivalDispatch | null
}
export type FestivalAdminResponse = FestivalResponse & {
  memberId: string
  name: string
  email: string
}
export type FestivalResponseList = {
  responses: FestivalAdminResponse[]
  pageSize: number
  total: number
  attending: number
  guests: number
  dispatch: number
}
