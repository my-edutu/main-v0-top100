'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Loader2, LockKeyhole } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  startAwardPaymentCheckout,
  type AwardPaymentCurrency,
  type AwardPaymentView,
} from '@/lib/awards/payment'

type AwardPaymentCardProps = {
  view: AwardPaymentView
  cancelled?: boolean
  onCheckout?: (
    currency: AwardPaymentCurrency,
  ) => Promise<{ checkoutUrl: string; attemptId: string }>
}

export function AwardPaymentCard({
  view,
  cancelled = false,
  onCheckout = startAwardPaymentCheckout,
}: AwardPaymentCardProps) {
  const defaultCurrency = useMemo(
    () =>
      view.priceOptions.find((option) => option.currency === 'NGN')?.currency ??
      view.priceOptions[0]?.currency ??
      'NGN',
    [view.priceOptions],
  )
  const [currency, setCurrency] = useState<AwardPaymentCurrency>(defaultCurrency)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedCurrency = view.priceOptions.some(
    (option) => option.currency === currency,
  )
    ? currency
    : defaultCurrency

  const selectedOption =
    view.priceOptions.find((option) => option.currency === selectedCurrency) ??
    view.priceOptions[0]

  async function handleCheckout() {
    if (!selectedOption || submitting) return

    setSubmitting(true)
    setError('')

    try {
      const result = await onCheckout(selectedOption.currency)
      if (!result.checkoutUrl) throw new Error('The payment checkout is unavailable.')

      // The URL is validated by the server-side checkout adapter. A full-page
      // navigation keeps the hosted payment session outside the dashboard.
      window.location.assign(result.checkoutUrl)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not start your payment. Please try again.',
      )
      setSubmitting(false)
    }
  }

  return (
    <section
      aria-labelledby="award-payment-title"
      className="overflow-hidden rounded-[22px] border border-[#E7DDCF] bg-white"
    >
      <div className="border-b border-[#E7DDCF] bg-[#FBF7EF] px-5 py-6 sm:px-7 sm:py-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#FFE7D5] text-[#6C2600]">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6C2600]">
              Redeem your physical award
            </p>
            <h1
              id="award-payment-title"
              className="mt-2 text-2xl font-semibold tracking-tight text-[#171412] sm:text-3xl"
            >
              Complete your award payment
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625B52] sm:text-base">
              Pay the award fee securely through Bachs to redeem the physical
              award. Delivery details and its charge are handled separately.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-8">
        {cancelled ? (
          <div
            role="status"
            className="rounded-[15px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
          >
            Your payment was cancelled. You can choose a currency and try again
            whenever you are ready.
          </div>
        ) : null}

        <fieldset>
          <legend className="text-sm font-semibold text-[#171412]">
            Choose a payment currency
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {view.priceOptions.map((option) => {
              const selected = option.currency === selectedCurrency
              return (
                <label
                  key={option.currency}
                  className={`relative flex min-h-16 cursor-pointer items-center gap-3 rounded-[15px] border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-[#F36C21] focus-within:ring-offset-2 ${
                    selected
                      ? 'border-[#F36C21] bg-[#FFF4EA]'
                      : 'border-[#D4C7B6] bg-white hover:border-[#F36C21] hover:bg-[#FFFAF5]'
                  }`}
                >
                  <input
                    type="radio"
                    name="award-payment-currency"
                    value={option.currency}
                    checked={option.currency === selectedCurrency}
                    onChange={() => setCurrency(option.currency)}
                    disabled={submitting}
                    className="h-4 w-4 accent-[#F36C21]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#171412]">
                      {option.currency}
                    </span>
                    <span className="mt-0.5 block text-sm text-[#625B52]">
                      {option.display}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {error ? (
          <p
            role="alert"
            className="rounded-[15px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-[#E7DDCF] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-xs leading-5 text-[#625B52]">
            This payment starts your physical award redemption. Bachs will show
            the payment methods available for the currency you choose; your
            payment details stay on the hosted checkout.
          </p>
          <Button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={!selectedOption || submitting}
            className="min-h-12 shrink-0 rounded-xl bg-[#171412] px-5 text-white hover:bg-[#312B27] disabled:bg-[#D4C7B6] disabled:text-[#625B52]"
          >
            {submitting ? (
              <>
                <Loader2
                  className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Opening Bachs checkout…
              </>
            ) : (
              <>
                Pay {selectedOption?.display ?? 'award fee'} with Bachs
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </div>
      </div>
    </section>
  )
}
