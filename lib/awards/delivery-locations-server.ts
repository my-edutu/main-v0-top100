import { allCountries } from 'country-region-data'
import { getGigQuoteCountries } from '@/lib/courier/gig-destinations'
import { nigeriaStates } from './locations'
import type { DeliveryRegion, DeliveryCitySuggestion, DeliveryLocationOptions } from './delivery-locations'

export function getDeliveryRegions(countryCode: string): DeliveryRegion[] {
  if (countryCode === 'NG') return nigeriaStates.map(state => ({ name: state.name, code: state.code }))
  return (allCountries.find(country => country[1] === countryCode)?.[2] ?? [])
    .map(region => ({ name: region[0], code: region[1] ?? '' }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

let countryCache: { expires: number; codes: string[] } | undefined
let pending: Promise<string[]> | undefined
async function quoteCountryCodes(): Promise<string[]> {
  if (countryCache && countryCache.expires > Date.now()) return countryCache.codes
  if (pending) return pending
  pending = getGigQuoteCountries().then(countries => {
    const codes = [...new Set(['NG', ...countries.map(country => country.code)])]
    countryCache = { expires: Date.now() + 300_000, codes }
    return codes
  }).finally(() => { pending = undefined })
  return pending
}
export async function getDeliveryLocationOptions(countryCode: string, live = true): Promise<DeliveryLocationOptions> {
  return { regions: getDeliveryRegions(countryCode), quoteCountries: live ? await quoteCountryCodes().catch(() => null) : null }
}

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\b(state|province|region|department)\b/g, '').replace(/[^a-z0-9]/g, '')

/** City names only. Never substitutes a city centre for an exact delivery address. */
export async function suggestDeliveryCities({ countryCode, region, query }: { countryCode: string; region: string; query: string }): Promise<DeliveryCitySuggestion[]> {
  const apiKey = process.env.GEOAPIFY_API_KEY?.trim()
  if (!apiKey) throw new Error('City suggestions are unavailable. Enter your city manually.')
  const selectedRegion = getDeliveryRegions(countryCode).find(item => item.name === region)
  if (region && !selectedRegion) return []
  const url = new URL('/v1/geocode/autocomplete', process.env.GEOAPIFY_BASE_URL || 'https://api.geoapify.com')
  url.search = new URLSearchParams({ text: query, type: 'city', filter: `countrycode:${countryCode.toLowerCase()}`, format: 'json', limit: '10', lang: 'en', apiKey }).toString()
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6_000), cache: 'no-store' })
    if (!response.ok) throw new Error('Unavailable')
    const payload = await response.json()
    if (!Array.isArray(payload.results)) throw new Error('Unavailable')
    const seen = new Set<string>()
    return payload.results.flatMap((row: Record<string, unknown>) => {
      if (String(row.country_code).toUpperCase() !== countryCode) return []
      const code = String(row.state_code ?? '').replace(new RegExp(`^${countryCode}-`), '')
      if (selectedRegion && code !== selectedRegion.code && ![row.state, row.county, row.region].some(value => typeof value === 'string' && normalize(value) === normalize(region))) return []
      const name = [row.city, row.town, row.village, row.name].find(value => typeof value === 'string' && value.length >= 2)
      if (typeof name !== 'string' || seen.has(name)) return []
      seen.add(name)
      return [{ name, label: typeof row.formatted === 'string' ? row.formatted : [name, region].filter(Boolean).join(', ') }]
    }).slice(0, 8)
  } catch {
    throw new Error('City suggestions are unavailable. Enter your city manually.')
  }
}
