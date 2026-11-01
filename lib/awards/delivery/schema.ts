import { z } from 'zod'
import { deliveryPreviewSchema } from '@/lib/awards/delivery-preview'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'

const contact = z.object({
  recipientName: z.string().trim().min(2, 'Enter the recipient’s full name.').max(150).regex(/^[^\u0000-\u001f\u007f]+$/, 'Enter a name without line breaks.'),
  phone: z.string().trim().max(40).transform((value, ctx) => {
    const phone = parsePhoneNumberFromString(value, { defaultCountry: 'NG', extract: false })
    if (!phone?.isValid() || phone.ext) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid recipient phone number.' })
      return z.NEVER
    }
    return phone.number
  }),
})

export function parseDeliveryQuoteInput(body: unknown) {
  const object = z.record(z.unknown()).parse(body)
  const { recipientName, phone, ...address } = object
  const details = deliveryPreviewSchema.parse(address)
  if (details.countryCode !== 'NG') throw new Error('Online dispatch is available within Nigeria. Contact the team to arrange international delivery.')
  return { ...details, ...contact.parse({ recipientName, phone }) }
}
export type DeliveryQuoteInput = ReturnType<typeof parseDeliveryQuoteInput>
export const deliveryCheckoutSchema = z.object({ deliveryId: z.string().uuid() }).strict()
