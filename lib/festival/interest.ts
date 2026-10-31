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
}
export type FestivalInterestList = {
  interests: (FestivalInterest & { memberId: string })[]
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
