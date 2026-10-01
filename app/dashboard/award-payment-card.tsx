'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'

import { startAwardPaymentCheckout, type AwardPaymentCurrency, type AwardPaymentView } from '@/lib/awards/payment'

type AwardPaymentCardProps = {
  view: AwardPaymentView
  cancelled?: boolean
}

export function AwardPaymentCard({
  view,
  cancelled = false,
}: AwardPaymentCardProps) {
  const [currency, setCurrency] = useState<AwardPaymentCurrency>('NGN')
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  async function startCheckout() {
    if (startingCheckout) return
    setStartingCheckout(true)
    setCheckoutError('')
    try {
      const checkout = await startAwardPaymentCheckout(currency)
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

      <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
        {cancelled ? (
          <div
            role="status"
            className="rounded-[15px] border border-amber-800 bg-[#342619] px-4 py-3 text-sm leading-6 text-amber-100"
          >
            Your payment was cancelled. You can return to Bachs and try again
            whenever you are ready.
          </div>
        ) : null}

        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-semibold text-[#F8F4F8]">Choose your payment currency</legend>
          {view.priceOptions.map((option) => (
            <label key={option.currency} className={`flex cursor-pointer items-center gap-3 rounded-[15px] border px-4 py-3 transition-colors ${currency === option.currency ? 'border-[#F97316] bg-[#38251F]' : 'border-[#4B434C] bg-[#211C24]'}`}>
              <input
                type="radio"
                name="award-payment-currency"
                value={option.currency}
                checked={currency === option.currency}
                onChange={() => setCurrency(option.currency)}
                className="h-4 w-4 accent-[#F97316]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#F8F4F8]">{option.currency === 'NGN' ? 'Naira (NGN)' : 'USD'}</span>
                <span className="mt-0.5 block text-sm text-[#D0C9D0]">{option.display}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-[#39323B] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-5 text-[#C8C0CA]">
            Bachs lets you choose your currency and review applicable charges
            before you pay. Use the same email as your awardee account.
          </p>
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={startingCheckout}
            className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(110deg,#f97316,#fb923c,#f59e0b)] px-5 font-semibold text-[#171412] shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F36C21] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            {startingCheckout ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Opening secure checkout</> : <>Pay with Bachs <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></>}
          </button>
        </div>
        {checkoutError ? <p role="alert" className="text-sm leading-6 text-rose-300">{checkoutError}</p> : null}
      </div>
    </section>
  )
}
