import { z } from 'zod'
import { deliveryCountry } from './delivery-preview'

export type DeliveryRegion = { name: string; code: string }
export type DeliveryCitySuggestion = { name: string; label: string }
export type DeliveryLocationOptions = { regions: DeliveryRegion[]; quoteCountries: string[] | null }

export const deliveryLocationQuery = z.object({
  countryCode: z.string().trim().toUpperCase().length(2).refine(code => !!deliveryCountry(code), 'Select a valid country.'),
  region: z.string().trim().max(100).default(''),
  query: z.string().trim().min(2).max(80).optional(),
})
