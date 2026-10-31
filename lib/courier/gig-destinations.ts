import { gigAuthedRequest, pickValue } from './http'

export type GigQuoteCountry = { id: number; code: string; name: string }

/** Account-specific automatic pricing destinations, not a worldwide service guarantee. */
export async function getGigQuoteCountries(): Promise<GigQuoteCountry[]> {
  const response = await gigAuthedRequest('country/get', { method: 'GET', retries: 1 })
  if (!response.ok || pickValue(response.data, 'success') === false) throw new Error('Country availability could not be checked.')
  const rows = ['data.data', 'data', 'Object'].map(path => pickValue(response.data, path)).find(Array.isArray)
  if (!Array.isArray(rows)) throw new Error('Country availability could not be checked.')
  const countries: GigQuoteCountry[] = rows.flatMap(row => {
    if (!row || row.IsActive !== true || row.IsDeleted === true || row.IsInternationalShippingCountry !== true) return []
    const code = String(row.CountryShortCode || row.CountryCode || '').trim().toUpperCase()
    const id = Number(row.CountryId)
    return /^[A-Z]{2}$/.test(code) && Number.isSafeInteger(id) && id > 0 && typeof row.CountryName === 'string'
      ? [{ id, code, name: row.CountryName }] : []
  })
  return countries.filter(country => countries.filter(other => other.code === country.code).length === 1)
}
