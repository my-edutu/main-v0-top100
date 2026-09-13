'use client'

import { useState } from 'react'
import { isNigeria, nigeriaState, nigeriaStates, locationSuggestions } from '@/lib/awards/locations'
import { DeliveryCountry } from './delivery-country'
import type { AwardAddressErrors } from '../_lib/award-journey'

export function DeliveryLocation({ country = '', state = '', city = '', errors }: { country?: string; state?: string; city?: string; errors: AwardAddressErrors }) {
  const [selectedCountry, setCountry] = useState(country || 'Nigeria')
  const [selectedState, setState] = useState(nigeriaState(state)?.name || state)
  const [selectedCity, setCity] = useState(city)
  const domestic = isNigeria(selectedCountry)
  const fieldClass = 'min-h-12 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 text-base'
  return <>
    <DeliveryCountry value={selectedCountry} error={errors.country} onChange={value => { setCountry(value); setState(''); setCity('') }} />
    <div className="space-y-2">
      <label htmlFor="award-state">State or region</label>
      {domestic ? <select id="award-state" name="state" value={selectedState} onChange={event => { setState(event.target.value); setCity('') }} required autoComplete="address-level1" aria-invalid={!!errors.state} aria-describedby={errors.state ? 'award-state-error' : undefined} className={fieldClass}>
        <option value="">Select your state</option>
        {selectedState && !nigeriaState(selectedState) ? <option value={selectedState}>{selectedState} — choose a valid state</option> : null}
        {nigeriaStates.map(item => <option key={item.code} value={item.name}>{item.name}</option>)}
      </select> : <input id="award-state" name="state" value={selectedState} onChange={event => setState(event.target.value)} autoComplete="address-level1" aria-invalid={!!errors.state} aria-describedby={errors.state ? 'award-state-error' : undefined} className={fieldClass} />}
      {errors.state ? <p id="award-state-error" className="text-sm text-rose-700">{errors.state}</p> : null}
    </div>
    <div className="space-y-2 md:col-span-2">
      <label htmlFor="award-city">City or town</label>
      <input id="award-city" name="city" value={selectedCity} onChange={event => setCity(event.target.value)} list={domestic ? 'award-location-options' : undefined} autoComplete="address-level2" aria-invalid={!!errors.city} aria-describedby={errors.city ? 'award-city-error' : 'award-city-help'} className={fieldClass} />
      {domestic ? <datalist id="award-location-options">{locationSuggestions(selectedState).map(name => <option key={name} value={name} />)}</datalist> : null}
      <p id="award-city-help" className="text-xs text-neutral-500">Choose a suggestion or enter your delivery city or town. Use the state where the parcel will be delivered.</p>
      {errors.city ? <p id="award-city-error" className="text-sm text-rose-700">{errors.city}</p> : null}
    </div>
  </>
}
