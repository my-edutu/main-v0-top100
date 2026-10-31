import { getCountries } from 'libphonenumber-js/min'
import { z } from 'zod'
import { isNigeria, nigeriaState } from './locations'

const names = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = getCountries().map(code => ({ code, name: names.of(code) ?? code }))

export function deliveryCountry(value: string) {
  const key = value.trim().toLowerCase()
  return countries.find(country => country.code.toLowerCase() === key || country.name.toLowerCase() === key)
}

export const deliveryPreviewSchema = z.object({
  deliveryMode: z.enum(['home', 'service_centre']).default('home'),
  addressLine1: z.string().trim().max(200).default(''),
  addressLine2: z.string().trim().max(200).default(''),
  city: z.string().trim().min(2, 'Enter your city or town.').max(100),
  state: z.string().trim().max(100).default(''),
  country: z.string().trim().min(2).max(100).optional(),
  countryCode: z.string().trim().length(2).optional(),
  provinceCode: z.string().trim().max(10).default(''),
  postalCode: z.string().trim().max(32).default(''),
  serviceCentreId: z.coerce.number().int().positive().optional(),
}).strict().superRefine((details, context) => {
  const country = deliveryCountry(details.countryCode ?? details.country ?? 'Nigeria')
  const issue = (path: string, message: string) => context.addIssue({ code: 'custom', path: [path], message })
  if (!country || (details.country && deliveryCountry(details.country)?.code !== country.code))
    issue('country', 'Select a valid delivery country.')
  const domestic = country?.code === 'NG'
  if (domestic && !nigeriaState(details.state)) issue('state', 'Select a valid Nigerian state or FCT.')
  if (details.deliveryMode === 'home') {
    if (details.addressLine1.length < 4) issue('addressLine1', 'Enter a street address.')
    if (details.serviceCentreId) issue('serviceCentreId', 'Remove the service-centre selection for home delivery.')
    if (!domestic && [details.addressLine1, details.addressLine2].filter(Boolean).join(', ').length > 100)
      issue('addressLine1', 'Use 100 characters or fewer for the international street address and landmark together.')
  } else {
    if (!domestic) issue('deliveryMode', 'GIG centre collection is available within Nigeria. Choose home delivery for other countries.')
    if (!details.serviceCentreId) issue('serviceCentreId', 'Choose a GIG service centre first.')
  }
}).transform(details => {
  const country = deliveryCountry(details.countryCode ?? details.country ?? 'Nigeria')!
  return {
    ...details,
    country: country.name,
    countryCode: country.code,
    state: isNigeria(country.code) ? nigeriaState(details.state)!.name : details.state,
  }
})

export type DeliveryPreviewInput = z.infer<typeof deliveryPreviewSchema>
export type DeliveryPreviewQuote = {
  amountMinor: number
  currency: 'NGN'
  deliveryMode: 'home' | 'service_centre'
  destination: string | null
  international?: boolean
  sample?: boolean
}
