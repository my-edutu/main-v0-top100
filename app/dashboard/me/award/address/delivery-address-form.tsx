'use client'

import { useState } from 'react'
import { ArrowLeft, LoaderCircle, MapPin, Truck } from 'lucide-react'
import Link from 'next/link'

import { nigeriaStates } from '@/lib/awards/locations'
import type { MemberProfile } from '@/lib/member-hub'

type DeliveryQuote = {
  amountMinor: number
  currency: string
  deliveryMode: 'home' | 'service_centre'
  destination: string | null
}

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountMinor / 100)
}

export function DeliveryAddressForm({ member }: { member: MemberProfile }) {
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [quote, setQuote] = useState<DeliveryQuote | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function requestQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setQuote(null)

    try {
      const response = await fetch('/api/member/award/delivery-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ addressLine1, addressLine2, city, state, country: 'Nigeria', postalCode }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'We could not calculate delivery. Please try again.')
      setQuote(body.quote as DeliveryQuote)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not calculate delivery. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = 'min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-[#171412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'

  return (
    <section className="max-w-2xl space-y-6">
      <Link href="/dashboard/me/award/complete" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-orange-800 underline underline-offset-4">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to your awards
      </Link>

      <div className="rounded-[22px] border border-stone-200 bg-white p-5 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-orange-100 text-orange-700">
            <Truck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Physical award</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#171412]">Get a delivery price</h1>
            <p className="mt-3 text-sm leading-6 text-[#625B52]">
              Enter your Nigerian delivery address to see GIG Logistics’ current shipping quote. Your address is used to calculate the price and isn’t saved by this check.
            </p>
          </div>
        </div>

        <form onSubmit={requestQuote} className="mt-7 space-y-4">
          <div className="space-y-2">
            <label htmlFor="delivery-recipient" className="text-sm font-medium text-[#292521]">Recipient</label>
            <input id="delivery-recipient" value={member.name} readOnly className={`${fieldClass} bg-stone-50`} />
          </div>
          <div className="space-y-2">
            <label htmlFor="delivery-address-line1" className="text-sm font-medium text-[#292521]">Street address</label>
            <input id="delivery-address-line1" autoComplete="address-line1" required minLength={4} maxLength={200} value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} placeholder="House number and street" className={fieldClass} />
          </div>
          <div className="space-y-2">
            <label htmlFor="delivery-address-line2" className="text-sm font-medium text-[#292521]">Area or landmark <span className="font-normal text-stone-500">(optional)</span></label>
            <input id="delivery-address-line2" autoComplete="address-line2" maxLength={200} value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} placeholder="Neighbourhood or nearby landmark" className={fieldClass} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="delivery-city" className="text-sm font-medium text-[#292521]">City or town</label>
              <input id="delivery-city" autoComplete="address-level2" required minLength={2} maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <label htmlFor="delivery-state" className="text-sm font-medium text-[#292521]">State</label>
              <select id="delivery-state" autoComplete="address-level1" required value={state} onChange={(event) => setState(event.target.value)} className={fieldClass}>
                <option value="">Select your state</option>
                {nigeriaStates.map((item) => <option key={item.code} value={item.name}>{item.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="delivery-postal-code" className="text-sm font-medium text-[#292521]">Postal code <span className="font-normal text-stone-500">(optional)</span></label>
            <input id="delivery-postal-code" autoComplete="postal-code" maxLength={32} value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={fieldClass} />
          </div>

          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{error}</p> : null}

          <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171412] px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-auto">
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}
            {loading ? 'Checking delivery price…' : 'Check delivery price'}
          </button>
        </form>
      </div>

      {quote ? (
        <div role="status" className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5 sm:p-7">
          <p className="text-sm font-medium text-emerald-900">Live GIG delivery quote</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-[#171412]">{money(quote.amountMinor, quote.currency)}</p>
          {quote.destination ? <p className="mt-3 break-words text-sm leading-6 text-emerald-950">Quoted to: {quote.destination}</p> : null}
          <p className="mt-2 text-xs leading-5 text-emerald-900">This price is for shipping. GIG may confirm the final delivery details when the award is arranged.</p>
        </div>
      ) : null}
    </section>
  )
}
