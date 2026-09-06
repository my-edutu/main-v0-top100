'use client'

import { getCountries } from 'libphonenumber-js/min'

const names = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = getCountries().map(code => ({ code, name: names.of(code) || code })).sort((a, b) => a.name.localeCompare(b.name))

export function DeliveryCountry({ value = '', error }: { value?: string; error?: string }) {
  const selected = countries.find(country => country.name.toLowerCase() === value.toLowerCase() || country.code.toLowerCase() === value.toLowerCase())?.name || ''
  return <div className="space-y-2">
    <label htmlFor="award-country">Country</label>
    <select id="award-country" name="country" defaultValue={selected} autoComplete="country-name" required aria-invalid={!!error} aria-describedby={error ? 'award-country-error' : undefined} className="min-h-12 w-full min-w-0 border bg-white px-3">
      <option value="">Select delivery country</option>
      {countries.map(country => <option key={country.code} value={country.name}>{country.name}</option>)}
    </select>
    {error && <p id="award-country-error" className="text-sm text-rose-700">{error}</p>}
  </div>
}
