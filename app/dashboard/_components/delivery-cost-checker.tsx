'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, LoaderCircle, MapPin, Truck } from 'lucide-react'
import Link from 'next/link'

import { nigeriaStates } from '@/lib/awards/locations'
import type { DeliveryMode } from '@/lib/courier/types'
import { deliveryCountry, type DeliveryPreviewQuote } from '@/lib/awards/delivery-preview'
import { DeliveryCountry } from './delivery-country'
import { DeliveryCityInput } from './delivery-city-input'
import type { DeliveryLocationOptions } from '@/lib/awards/delivery-locations'
import './delivery-cost.css'

type ServiceCentre = { id: number; name: string; address: string }

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amountMinor / 100)
}

export function DeliveryCostChecker({
  recipientName,
  backHref,
  backLabel = 'Back to dashboard',
}: { recipientName?: string; backHref?: string; backLabel?: string }) {
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('home')
  const [country, setCountry] = useState('Nigeria')
  const [provinceCode, setProvinceCode] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [centres, setCentres] = useState<ServiceCentre[]>([])
  const [serviceCentreId, setServiceCentreId] = useState('')
  const [centresLoaded, setCentresLoaded] = useState(false)
  const [centresLoading, setCentresLoading] = useState(false)
  const [centreError, setCentreError] = useState('')
  const [quote, setQuote] = useState<DeliveryPreviewQuote | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locationData, setLocationData] = useState<{ countryCode: string; options: DeliveryLocationOptions } | null>(null)
  const [locationError, setLocationError] = useState<{ countryCode: string; message: string } | null>(null)
  const busy = useRef(false)
  const quoteRef = useRef<HTMLDivElement>(null)
  const countryCode = deliveryCountry(country)?.code ?? 'NG'
  const domestic = countryCode === 'NG'
  const options = locationData?.countryCode === countryCode ? locationData.options : null
  const locationMessage = locationError?.countryCode === countryCode ? locationError.message : ''
  const locationsLoading = !options && !locationMessage
  const regions = domestic ? nigeriaStates.map(item => ({ name: item.name, code: item.code })) : options?.regions ?? []
  const selectedRegion = regions.find(region => region.name === state)
  const quoteUnavailable = !domestic && !!options?.quoteCountries && !options.quoteCountries.includes(countryCode)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/member/award/delivery-options?${new URLSearchParams({ countryCode })}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => { const body = await response.json(); if (!response.ok || !Array.isArray(body.regions)) throw new Error('Unavailable'); return body as DeliveryLocationOptions })
      .then(data => { if (!controller.signal.aborted) { setLocationData({ countryCode, options: data }); setLocationError(null) } })
      .catch(() => { if (!controller.signal.aborted) setLocationError({ countryCode, message: 'Location choices could not be loaded. You can enter your region and city manually.' }) })
    return () => controller.abort()
  }, [countryCode])

  useEffect(() => {
    if (!quote) return
    quoteRef.current?.focus({ preventScroll: true })
    quoteRef.current?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }, [quote])

  function resetCentres() {
    setCentres([])
    setServiceCentreId('')
    setCentresLoaded(false)
    setCentreError('')
  }

  async function findCentres() {
    if (busy.current) return
    busy.current = true
    setCentresLoading(true)
    resetCentres()
    setQuote(null)
    setError('')
    try {
      const params = new URLSearchParams({ state, city })
      const response = await fetch(`/api/member/award/service-centres?${params}`, { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'Could not load GIG centres. Please try again.')
      if (!Array.isArray(body.serviceCentres)) throw new Error('Could not load GIG centres. Please try again.')
      setCentres(body.serviceCentres)
      setCentresLoaded(true)
    } catch (cause) {
      setCentreError(cause instanceof Error ? cause.message : 'Could not load GIG centres. Please try again.')
    } finally {
      busy.current = false
      setCentresLoading(false)
    }
  }

  async function requestQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (quoteUnavailable) return
    if (busy.current) return
    busy.current = true
    setLoading(true)
    setError('')
    setQuote(null)
    try {
      const response = await fetch('/api/member/award/delivery-quote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({
          deliveryMode, city, state, country, provinceCode,
          ...(deliveryMode === 'home'
            ? { addressLine1, addressLine2, postalCode }
            : { serviceCentreId: Number(serviceCentreId) }),
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'We could not calculate delivery. Please try again.')
      if (!body.quote || !Number.isSafeInteger(body.quote.amountMinor) || body.quote.amountMinor <= 0 || body.quote.currency !== 'NGN') {
        throw new Error('GIG did not return a usable delivery price. Please try again.')
      }
      setQuote(body.quote as DeliveryPreviewQuote)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not calculate delivery. Please try again.')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  const fieldClass = 'min-h-12 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 text-base text-[#171412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'
  const selectedCentre = centres.find((centre) => String(centre.id) === serviceCentreId)
  const actionClass = 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ffdf45] px-5 text-sm font-medium text-[#171412] transition hover:bg-[#ffd62b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'

  return (
    <section className="delivery-cost-checker min-w-0 max-w-2xl space-y-6">
      {backHref ? <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-orange-800 underline underline-offset-4">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{backLabel}
      </Link> : null}

      <div className="rounded-[22px] border border-stone-200 bg-white p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-orange-100 text-orange-700">
            <Truck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange-700">Award delivery</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#171412] sm:text-3xl">Check delivery cost</h1>
            <p className="delivery-cost-description">
              Delivery within Nigeria or abroad, priced separately from your award fee.
            </p>
          </div>
        </div>

        <form onSubmit={requestQuote} onChange={() => { setQuote(null); setError('') }} className="mt-7">
          <fieldset disabled={loading || centresLoading} className="min-w-0 space-y-5 disabled:opacity-70">
            <legend className="sr-only">Delivery destination and method</legend>
            <DeliveryCountry value={country} onChange={(value) => {
              setCountry(value); setLocationError(null); setState(''); setProvinceCode(''); setCity(''); setAddressLine1(''); setAddressLine2(''); setPostalCode(''); setDeliveryMode('home'); resetCentres()
            }} />
            {options?.quoteCountries && <div className="delivery-coverage">
              {quoteUnavailable && <p role="status">GIG automatic pricing is not enabled for {country} on our account. <a href={`mailto:nigeriatop100@gmail.com?subject=${encodeURIComponent(`Award delivery quote to ${country}`)}`}>Contact Top100 for a delivery quote.</a></p>}
              <details><summary>Countries with automatic pricing</summary><p>{options.quoteCountries.map(code => deliveryCountry(code)?.name ?? code).join(', ')}. Rates depend on your exact destination.</p></details>
            </div>}
            {options && options.quoteCountries === null && <p className="text-xs leading-5 text-stone-600">Automatic-pricing availability has not been confirmed. You can still try a delivery quote.</p>}
            {domestic ? <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-medium text-[#292521]">How would you receive your award?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([{ value: 'home', label: 'Home delivery' }, { value: 'service_centre', label: 'Collect from a GIG centre' }] as const).map((mode) => (
                <label key={mode.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm ${deliveryMode === mode.value ? 'border-orange-500 bg-orange-50 text-orange-950' : 'border-stone-300 text-stone-700'}`}>
                  <input type="radio" name="delivery-mode" value={mode.value} checked={deliveryMode === mode.value} onChange={() => { setDeliveryMode(mode.value); resetCentres() }} className="h-4 w-4 shrink-0 accent-orange-700" />
                  {mode.label}
                </label>
              ))}
            </div>
            </fieldset> : <div className="delivery-cost-international">
              <Truck size={20} aria-hidden="true" />
              <div><p>International home delivery</p><span>From Nigeria to your address in {country}.</span></div>
            </div>}

            {recipientName ? <div className="space-y-2">
              <label htmlFor="delivery-recipient" className="text-sm font-medium text-[#292521]">Recipient</label>
              <input id="delivery-recipient" value={recipientName} readOnly className={`${fieldClass} bg-stone-50`} />
            </div> : null}

            {deliveryMode === 'home' ? <>
              <div className="space-y-2">
                <label htmlFor="delivery-address-line1" className="text-sm font-medium text-[#292521]">Street address</label>
                <input id="delivery-address-line1" autoComplete="address-line1" required minLength={4} maxLength={domestic ? 200 : 100} value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder="House number and street" aria-describedby="delivery-street-help" className={fieldClass} />
                <p id="delivery-street-help" className="text-xs leading-5 text-stone-600">Use a full street address so we can locate your destination accurately.</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="delivery-address-line2" className="text-sm font-medium text-[#292521]">Area or landmark <span className="font-normal text-stone-500">(optional)</span></label>
                <input id="delivery-address-line2" autoComplete="address-line2" maxLength={200} value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} placeholder="Neighbourhood or nearby landmark" className={fieldClass} />
              </div>
            </> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label htmlFor="delivery-state" className="text-sm font-medium text-[#292521]">{domestic ? 'State' : 'State or region (optional)'}</label>
                {regions.length > 0 || locationsLoading ?
                <select id="delivery-state" autoComplete="address-level1" required={domestic} disabled={!domestic && locationsLoading} value={state} onChange={(event) => { const region = regions.find(item => item.name === event.target.value); setState(event.target.value); setProvinceCode(domestic ? '' : region?.code ?? ''); setCity(''); resetCentres() }} className={fieldClass}>
                  <option value="">{locationsLoading && !domestic ? 'Loading regions…' : domestic ? 'Select your state' : 'Select your state or region'}</option>
                  {regions.map((item) => <option key={item.code || item.name} value={item.name}>{item.name}</option>)}
                </select> : <input id="delivery-state" autoComplete="address-level1" maxLength={100} value={state} onChange={event => { setState(event.target.value); setProvinceCode(''); setCity(''); resetCentres() }} className={fieldClass} />}
                {locationMessage && <p role="status" className="text-xs leading-5 text-stone-600">{locationMessage}</p>}
                {!domestic && selectedRegion?.code && <p className="text-xs leading-5 text-stone-600">Province code: {selectedRegion.code}</p>}
              </div>
              <div className="min-w-0 space-y-2">
                <label htmlFor="delivery-city" className="text-sm font-medium text-[#292521]">City or town</label>
                <DeliveryCityInput key={`${countryCode}:${state}`} countryCode={countryCode} region={state} value={city} onChange={value => { setCity(value); setQuote(null); setError(''); resetCentres() }} className={fieldClass} />
              </div>
            </div>

            {!domestic && !locationsLoading && !selectedRegion?.code && (regions.length === 0 || !!state) && <div className="space-y-2">
              <label htmlFor="delivery-province-code" className="text-sm font-medium text-[#292521]">State / province code <span className="font-normal text-stone-500">(optional)</span></label>
              <input id="delivery-province-code" maxLength={10} value={provinceCode} onChange={event => setProvinceCode(event.target.value.toUpperCase())} aria-describedby="delivery-province-help" className={fieldClass} />
              <p id="delivery-province-help" className="text-xs leading-5 text-stone-600">Use your address’s state or province code, if required. Choosing a listed region fills this automatically.</p>
            </div>}

            {deliveryMode === 'home' ? <div className="space-y-2">
              <label htmlFor="delivery-postal-code" className="text-sm font-medium text-[#292521]">Postal code <span className="font-normal text-stone-500">(optional)</span></label>
              <input id="delivery-postal-code" autoComplete="postal-code" maxLength={32} value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={fieldClass} />
            </div> : <div className="space-y-3">
              <p className="text-sm leading-6 text-stone-600">Enter your state and city, then find a verified GIG collection centre.</p>
              <button type="button" onClick={() => void findCentres()} disabled={!state || city.trim().length < 2} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 px-4 text-sm font-medium text-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:opacity-50">
                {centresLoading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {centresLoading ? 'Finding centres…' : centreError ? 'Retry finding centres' : 'Find GIG centres'}
              </button>
              {centreError ? <p role="alert" className="text-sm leading-6 text-rose-800">{centreError}</p> : null}
              {centresLoaded && centres.length === 0 ? <p role="status" className="text-sm leading-6 text-stone-600">No GIG centres were found for this location. Try another city or choose home delivery.</p> : null}
              {centres.length > 0 ? <div className="space-y-2">
                <label htmlFor="delivery-centre" className="text-sm font-medium text-[#292521]">GIG collection centre</label>
                <select id="delivery-centre" required value={serviceCentreId} onChange={(event) => setServiceCentreId(event.target.value)} aria-describedby={selectedCentre ? 'delivery-centre-address' : undefined} className={fieldClass}>
                  <option value="">Choose a centre</option>
                  {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
                </select>
                {selectedCentre ? <p id="delivery-centre-address" className="break-words text-sm leading-6 text-stone-600">{selectedCentre.address || selectedCentre.name}</p> : null}
              </div> : null}
            </div>}

            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{error}</p> : null}

            {quoteUnavailable ? <a className={`${actionClass} delivery-manual-quote`} href={`mailto:nigeriatop100@gmail.com?subject=${encodeURIComponent(`Award delivery quote to ${country}`)}`}>Request a delivery quote</a> : <button type="submit" disabled={deliveryMode === 'service_centre' && !selectedCentre} className={actionClass}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}
              {loading ? 'Checking delivery cost…' : 'Check delivery cost'}
            </button>}
          </fieldset>
          <p className="mt-4 text-xs leading-5 text-stone-600">This check does not save your address, take payment or book delivery. Prices can change before delivery is arranged.</p>
        </form>
      </div>

      {quote ? <div ref={quoteRef} tabIndex={-1} role="status" aria-label="Delivery estimate" className="delivery-cost-result rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
        <p className="text-sm font-medium text-emerald-900">{quote.sample ? 'Sample delivery estimate · Local preview' : quote.international ? 'International delivery estimate' : 'Live GIG delivery quote'}</p>
        <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#171412]">{quote.international && <span className="text-base font-normal">From </span>}{money(quote.amountMinor, quote.currency)}</p>
        <p className="mt-2 text-sm text-emerald-950">{quote.international ? 'International home delivery' : quote.deliveryMode === 'home' ? 'Home delivery' : 'Collection from a GIG centre'}</p>
        {quote.destination ? <p className="mt-3 break-words text-sm leading-6 text-emerald-950">Quoted to: {quote.destination}</p> : null}
        <p className="mt-3 text-xs leading-5 text-emerald-900">{quote.sample ? 'This sample price demonstrates the flow. It is not a live carrier rate.' : quote.international ? 'Lowest available carrier quote for your physical award. Final packaging can change the price.' : 'This is the current shipping price for your physical award.'} No payment has been taken.</p>
      </div> : null}
    </section>
  )
}
