'use client'

import { useState } from 'react'
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/min'
import { internationalDeliveryPhone } from '@/lib/awards/phone'

const names = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = getCountries().sort((a, b) => (names.of(a) ?? a).localeCompare(names.of(b) ?? b))

export function DeliveryPhone({ defaultValue, deliveryCountry, error }: { defaultValue: string; deliveryCountry?: string; error?: string }) {
  const parsed = parsePhoneNumberFromString(defaultValue)
  const fallback = countries.find(code => code === deliveryCountry?.toUpperCase() || names.of(code)?.toLowerCase() === deliveryCountry?.toLowerCase()) ?? 'NG'
  const [country, setCountry] = useState<CountryCode>(parsed?.country ?? fallback)
  const [number, setNumber] = useState(parsed?.country ? String(parsed.nationalNumber) : defaultValue)
  return <div className="space-y-3">
    <div className="space-y-2">
      <label htmlFor="award-phone-country" className="block text-sm font-medium">Phone country / code</label>
      <select id="award-phone-country" value={country} onChange={event => setCountry(event.target.value as CountryCode)} className="h-12 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 text-base" autoComplete="tel-country-code">
        {countries.map(code => <option key={code} value={code}>{names.of(code)} (+{getCountryCallingCode(code)})</option>)}
      </select>
    </div>
    <div className="space-y-2">
      <label htmlFor="award-phone" className="block text-sm font-medium">Phone number</label>
      <input id="award-phone" type="tel" inputMode="tel" autoComplete="tel-national" value={number} onChange={event => {
        const value = event.target.value
        const pasted = value.startsWith('+') ? parsePhoneNumberFromString(value) : undefined
        if (pasted?.country) { setCountry(pasted.country); setNumber(String(pasted.nationalNumber)) }
        else setNumber(value)
      }} aria-invalid={Boolean(error)} aria-describedby={error ? 'award-phone-error award-phone-help' : 'award-phone-help'} placeholder="Your local phone number" className="h-12 w-full min-w-0 rounded-xl border border-neutral-300 bg-white px-3 text-base aria-[invalid=true]:border-red-600" />
      <input type="hidden" name="phone" value={internationalDeliveryPhone(number, country)} />
      <p id="award-phone-help" className="text-xs leading-5 text-neutral-500">We’ll add +{getCountryCallingCode(country)}. Your phone country can differ from your delivery country.</p>
      {error && <p id="award-phone-error" className="text-sm text-red-700">Choose the phone country and enter a complete phone number.</p>}
    </div>
  </div>
}
