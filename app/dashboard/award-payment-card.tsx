'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import { getCountries } from 'libphonenumber-js/min'
import { ArrowRight, Check, ChevronDown, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import Image from '@/components/safe-image'

import { previewAwardCoupon, startAwardPaymentCheckout, type AwardCouponQuote, type AwardPaymentView } from '@/lib/awards/payment'
import { formatAwardFee } from '@/lib/awards/payment-price'
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

const couponToastId = 'award-coupon-applied'
const couponPercent = new Intl.NumberFormat('en-NG', { style: 'percent', maximumFractionDigits: 1 })
const confettiColors = ['#FFB77E', '#F97316', '#FFE58A', '#86EFAC']
const couponConfetti = Array.from({ length: 16 }, (_, index) => ({
  '--splash-x': `${((index * 73 + 19) % 300) - 150}px`,
  '--splash-y': `${((index * 29 + 11) % 80) - 40}px`,
  '--splash-delay': `${(index % 4) * 40}ms`,
  '--splash-color': confettiColors[index % confettiColors.length],
} as CSSProperties))

function celebrateCoupon(quote: AwardCouponQuote) {
  const discount = couponPercent.format(quote.discountAmountMinor / quote.baseAmountMinor)
  const savings = formatAwardFee(quote.discountAmountMinor, quote.currency)

  toast.custom((id) => (
    <div className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-[#885635] bg-[#211C24] p-3 pl-4 text-white shadow-xl">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {couponConfetti.map((style, index) => (
          <span key={index} className={`top100-moment-splash-confetti ${index % 4 === 0 ? 'is-circle' : ''}`} style={style} />
        ))}
      </div>
      <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#F97316] text-[#171412]">
        <Check aria-hidden="true" className="size-5" />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="font-semibold">{discount} coupon applied</p>
        <p className="text-sm text-[#D0C9D0]">You saved {savings} on your award.</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss coupon confirmation"
        onClick={() => toast.dismiss(id)}
        className="relative grid size-11 shrink-0 place-items-center rounded-lg text-[#D0C9D0] hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#F97316]"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  ), { id: couponToastId, position: 'top-center', duration: 5000 })
}

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

  const [showCoupon, setShowCoupon] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [couponQuote, setCouponQuote] = useState<AwardCouponQuote | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [couponError, setCouponError] = useState('')

  const checkoutUnavailable = view.checkoutEnabled === false
  const validEmail = email.trim().length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function applyCoupon() {
    if (checkingCoupon || !couponCode.trim()) return
    setCheckingCoupon(true)
    setCouponError('')
    try {
      const quote = await previewAwardCoupon(couponCode)
      setCouponQuote(quote)
      celebrateCoupon(quote)
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'Could not check the coupon.')
    } finally {
      setCheckingCoupon(false)
    }
  }

  function clearCoupon() {
    toast.dismiss(couponToastId)
    setCouponCode('')
    setCouponQuote(null)
    setCouponError('')
    setShowCoupon(false)
  }

  const couponNeedsApplying = showCoupon && Boolean(couponCode.trim()) && !couponQuote

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (startingCheckout || checkingCoupon || couponNeedsApplying || checkoutUnavailable || !countryCode || !validEmail) return
    setStartingCheckout(true)
    setCheckoutError('')
    try {
      const checkout = await startAwardPaymentCheckout({
        countryCode, email: email.trim(), ...(couponQuote ? { couponCode } : {}),
      })
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
        {!checkoutUnavailable && (
          <div className="space-y-3 border-t border-[#39323B] pt-4">
            {!showCoupon ? (
              <button type="button" disabled={startingCheckout} onClick={() => setShowCoupon(true)} className="min-h-11 text-sm font-medium text-[#FFB77E] underline underline-offset-4">
                Have a coupon?
              </button>
            ) : (
              <>
                <fieldset disabled={checkingCoupon || startingCheckout} className="flex flex-wrap items-end gap-2">
                  <label className="min-w-0 flex-1 basis-40 text-sm font-medium">
                    Coupon code
                    <input
                      value={couponCode}
                      maxLength={64}
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      onChange={(event) => {
                        if (couponQuote) toast.dismiss(couponToastId)
                        setCouponCode(event.target.value)
                        setCouponQuote(null)
                        setCouponError('')
                      }}
                      className="mt-2 min-h-12 w-full rounded-xl border border-[#4B434C] bg-[#211C24] px-3"
                    />
                  </label>
                  {!couponQuote && (
                    <button type="button" onClick={() => void applyCoupon()} disabled={!couponCode.trim()} className="min-h-12 rounded-xl border border-[#4B434C] px-4 text-sm font-semibold disabled:opacity-60">
                      {checkingCoupon ? 'Checking…' : 'Apply'}
                    </button>
                  )}
                  <button type="button" onClick={clearCoupon} className="min-h-12 px-2 text-sm text-[#D0C9D0] underline underline-offset-4">
                    Remove
                  </button>
                </fieldset>
                {couponError && <p role="alert" className="text-sm text-rose-300">{couponError}</p>}
                {couponQuote && (
                  <dl aria-live="polite" className="space-y-1 rounded-xl border border-[#39323B] px-4 py-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt>Award fee</dt><dd>{formatAwardFee(couponQuote.baseAmountMinor, 'NGN')}</dd>
                    </div>
                    <div className="flex justify-between gap-3 text-[#FFB77E]">
                      <dt>Coupon discount</dt><dd>−{formatAwardFee(couponQuote.discountAmountMinor, 'NGN')}</dd>
                    </div>
                    <div className="flex justify-between gap-3 font-semibold">
                      <dt>Discounted award fee</dt><dd>{formatAwardFee(couponQuote.amountMinor, 'NGN')}</dd>
                    </div>
                  </dl>
                )}
              </>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3 border-t border-[#39323B] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-5 text-[#C8C0CA]">
            {couponQuote
              ? 'Your coupon checkout is in naira. Bachs will show any payment charges on the next screen. Delivery is quoted separately.'
              : 'Choose your billing country and the email address for checkout. Bachs will show available currencies and the final amount on the next screen. Delivery is arranged and quoted separately based on your destination.'}
          </p>
          <button
            type="submit"
            disabled={startingCheckout || checkingCoupon || couponNeedsApplying || checkoutUnavailable || !countryCode || !validEmail}
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
