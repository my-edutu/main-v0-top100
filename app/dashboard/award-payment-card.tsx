'use client'

import { useState, type FormEvent } from 'react'
import { getCountries } from 'libphonenumber-js/min'
import { ArrowRight, ChevronDown, Loader2 } from 'lucide-react'
import Image from '@/components/safe-image'

import { startAwardPaymentCheckout, type AwardPaymentView } from '@/lib/awards/payment'
import { trackAwardFunnel } from '@/lib/awards/funnel'

type AwardPaymentCardProps = {
  view: AwardPaymentView
  cancelled?: boolean
  memberId?: string
  memberEmail?: string
}

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' })
const billingCountries = getCountries()
  .map((code) => ({ code, name: countryDisplayNames.of(code) ?? code }))
  .sort((left, right) => left.name.localeCompare(right.name))

export function AwardPaymentCard({
  view,
  cancelled = false,
  memberId,
  memberEmail = '',
}: AwardPaymentCardProps) {
  const [countryCode, setCountryCode] = useState('NG')
  const [email, setEmail] = useState(memberEmail)
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const checkoutUnavailable = view.checkoutEnabled === false
  const validEmail = email.trim().length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startingCheckout || checkoutUnavailable || !countryCode || !validEmail) return
    setStartingCheckout(true)
    setCheckoutError('')
    try {
      const checkout = await startAwardPaymentCheckout({ countryCode, email: email.trim() })
      if (memberId) trackAwardFunnel(memberId, 'checkout_started')
      window.location.assign(checkout.checkoutUrl)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Could not start payment. Please try again.')
      setStartingCheckout(false)
    }
  }

  return (
    <section
      aria-labelledby="award-payment-title"
      className="award-payment-card overflow-hidden rounded-[22px] border border-[#39323B] bg-[#17151B] text-white"
    >
      <div className="border-b border-[#39323B] bg-[#211C24] px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex flex-col">
          <div className="mb-5 flex justify-center">
            <Image
              src="/illustrations/physical-award-emblem.svg"
              width={88}
              height={88}
              alt=""
              unoptimized
              className="h-[5.5rem] w-[5.5rem]"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB77E]">
              Receive your physical award
            </p>
            <h2
              id="award-payment-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              Complete your physical award fee
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D0C9D0] sm:text-base">
              Your Africa Future Leaders recognition has already been awarded.
              This fee covers the physical award only; it does not affect your
              selection or recognition. Delivery is arranged and quoted
              separately based on your destination.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={(event) => void startCheckout(event)} className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
        {cancelled ? (
          <div
            role="status"
            className="rounded-[15px] border border-amber-800 bg-[#342619] px-4 py-3 text-sm leading-6 text-amber-100"
          >
            Your payment was cancelled. You can return here and try again
            whenever you are ready.
          </div>
        ) : null}

        <fieldset disabled={checkoutUnavailable || startingCheckout} className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-semibold text-[#F8F4F8]">Your billing details</legend>
          <label className="block text-sm font-medium text-[#F8F4F8]">Country
            <span className="relative mt-2 block">
              <select required value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="min-h-12 w-full appearance-none rounded-xl border border-[#4B434C] bg-[#211C24] px-3 pr-10 text-sm text-[#F8F4F8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]">
                <option value="" className="bg-[#211C24]">Select your country</option>
                {billingCountries.map((country) => <option key={country.code} value={country.code} className="bg-[#211C24]">{country.name}</option>)}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#D0C9D0]" />
            </span>
          </label>
          <label className="block text-sm font-medium text-[#F8F4F8]">Email address
            <input type="email" required maxLength={320} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="mt-2 min-h-12 w-full rounded-xl border border-[#4B434C] bg-[#211C24] px-3 text-sm text-[#F8F4F8] placeholder:text-[#918A93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]" />
          </label>
        </fieldset>
        <div className="flex flex-col gap-3 border-t border-[#39323B] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-5 text-[#C8C0CA]">
            Choose your billing country and the email address for checkout. Bachs will show available currencies and the final amount on the next screen. Delivery is arranged and quoted separately based on your destination.
          </p>
          <button
            type="submit"
            disabled={startingCheckout || checkoutUnavailable || !countryCode || !validEmail}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(110deg,#f97316,#fb923c,#f59e0b)] px-5 font-semibold text-[#171412] shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F36C21] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {checkoutUnavailable ? 'Payments are not open yet' : startingCheckout ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Opening secure checkout</> : <>Proceed <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>}
          </button>
        </div>
        {checkoutUnavailable ? <p role="status" className="text-sm leading-6 text-[#D0C9D0]">Physical award payments are not open yet. Please return once payment is available. Your recognition remains confirmed.</p> : null}
        {checkoutError ? <p role="alert" className="text-sm leading-6 text-rose-300">{checkoutError}</p> : null}
      </form>
    </section>
  )
}
