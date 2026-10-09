'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Image from '@/components/safe-image'
import { ArrowRight, BadgeCheck, CreditCard, Loader2, RefreshCw } from 'lucide-react'
import { getCountries } from 'libphonenumber-js/min'

import { magazinePaymentScreen } from '@/lib/magazine/payment-flow'
type CheckoutMember = { name: string; email: string; location: string }

type PaymentView = {
  campaign: { title: string; description: string; ngnAmountMinor: number; usdAmountMinor: number; applicationOpen: boolean }
  checkoutEnabled: boolean
  orderStatus: string
  applicationEligible: boolean
  currentAttempt: { id: string; status: string; currency: string; amountMinor: number; expiresAt: string | null; checkoutUrl?: string } | null
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const billingCountries = getCountries()
  .map((code) => ({ code, name: countryNames.of(code) ?? code }))
  .sort((left, right) => left.name.localeCompare(right.name))

export function MagazinePaymentGate({ children, member }: { children: ReactNode; member: CheckoutMember }) {
  const [payment, setPayment] = useState<PaymentView | null>(null)
  const [loading, setLoading] = useState(true)
  const [returnedFromPayment, setReturnedFromPayment] = useState(false)
  const [confirmationAccepted, setConfirmationAccepted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [countryCode, setCountryCode] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [error, setError] = useState('')

  const requestPayment = useCallback(async (demoReturn = false) => {
    const paymentUrl = demoReturn ? '/api/member/magazine/payment?payment=done&demo=1' : '/api/member/magazine/payment'
    const response = await fetch(paymentUrl, { cache: 'no-store' })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.message || 'Could not check your magazine payment.')
    return payload.payment as PaymentView
  }, [])

  const refresh = useCallback(async (quiet = false, showLoading = true) => {
    if (quiet) setRefreshing(true)
    else if (showLoading) setLoading(true)
    const search = new URLSearchParams(window.location.search)
    try {
      const nextPayment = await requestPayment(search.get('payment') === 'done' && search.get('demo') === '1')
      setPayment(nextPayment)
      setReturnedFromPayment(search.get('payment') === 'done')
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not check your magazine payment.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [requestPayment])

  const startCheckout = useCallback(async () => {
    if (!countryCode || startingCheckout) return
    setCheckoutError('')
    setStartingCheckout(true)
    try {
      const response = await fetch('/api/member/magazine/payment/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: member.name, email: member.email, countryCode }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not start your magazine payment.')
      if (typeof payload.checkoutUrl !== 'string') throw new Error('Bachs did not return a checkout link. Please try again.')
      window.location.assign(payload.checkoutUrl)
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : 'Could not start your magazine payment.')
      setStartingCheckout(false)
    }
  }, [countryCode, member.email, member.name, startingCheckout])

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    void requestPayment(search.get('payment') === 'done' && search.get('demo') === '1')
      .then((nextPayment) => {
        setError('')
        setPayment(nextPayment)
        setReturnedFromPayment(search.get('payment') === 'done')
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Could not check your magazine payment.'))
      .finally(() => setLoading(false))
  }, [requestPayment])

  const screen = magazinePaymentScreen({
    loading,
    paymentConfirmed: Boolean(payment?.applicationEligible),
    returnedFromPayment,
    confirmationAccepted,
  })
  if (screen === 'loading') return <div role="status" className="rounded-2xl border border-[#E8DED3] bg-white p-5 text-sm text-[#625B52]"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden="true" />Checking the separate magazine feature payment…</div>
  if (screen === 'application') return <>{children}</>
  if (screen === 'confirmation') {
    function continueToApplication() {
      setConfirmationAccepted(true)
      setReturnedFromPayment(false)
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('demo')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    }

    return (
      <section className="overflow-hidden rounded-[22px] border border-[#E8DED3] bg-white" aria-labelledby="magazine-payment-confirmed-title">
        <div className="h-1 bg-gradient-to-r from-[#F36D21] to-[#F5A313]" aria-hidden="true" />
        <div className="space-y-5 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <Image src="/illustrations/payment-success.svg" alt="" aria-hidden="true" width={48} height={48} className="h-12 w-12 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800">Payment confirmed</p>
              <h2 id="magazine-payment-confirmed-title" className="mt-1 text-xl font-medium tracking-tight text-[#171412]">Your application is ready</h2>
              <p className="mt-2 text-sm leading-6 text-[#625B52]">Your magazine feature payment has been confirmed. Continue when you’re ready to submit your story for editorial review.</p>
            </div>
          </div>
          <button type="button" onClick={continueToApplication} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] px-5 text-sm font-semibold text-[#171412] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2 sm:w-auto">
            Continue to application <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    )
  }

  const busy = refreshing
  const pending = payment?.orderStatus === 'pending' || payment?.currentAttempt?.status === 'open' || payment?.currentAttempt?.status === 'creating'
  const resumeUrl = payment?.currentAttempt?.checkoutUrl

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E8DED3] bg-white" aria-labelledby="magazine-payment-title">
      <div className="h-1 bg-gradient-to-r from-[#F36D21] to-[#F5A313]" aria-hidden="true" />
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E8] text-[#943A0A]"><CreditCard className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A4619]">Separate magazine fee</p><h2 id="magazine-payment-title" className="mt-1 text-xl font-medium tracking-tight text-[#171412]">{payment?.campaign.title ?? 'Magazine feature application'}</h2><p className="mt-2 text-sm leading-6 text-[#625B52]">{payment?.campaign.description ?? 'A separate payment is required before you can submit your feature application.'}</p></div>
        </div>
        <div>
          {pending ? <p role="status" className="mt-5 rounded-xl bg-[#F8F5F1] px-4 py-3 text-sm leading-6 text-[#625B52]">Your payment is being confirmed. Continue in the open secure checkout; its currency and details are fixed.</p> : null}
          {!pending ? <p className="mt-5 rounded-xl border border-[#E8DED3] bg-[#FFF8F1] px-4 py-3 text-sm leading-6 text-[#625B52]">We’ll use your awardee account name and email to prepare checkout. Select your billing country, then review the currency and total, including any applicable charges, before paying.</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        {checkoutError ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{checkoutError}</p> : null}
        {!payment?.campaign.applicationOpen && payment?.orderStatus !== 'paid' ? <p className="mt-4 text-sm text-[#716B62]">This campaign is closed to new payments.</p> : null}
        {!pending && payment?.campaign.applicationOpen && !payment?.checkoutEnabled ? <p role="status" className="mt-4 rounded-xl bg-[#F8F5F1] px-4 py-3 text-sm leading-6 text-[#625B52]">Magazine checkout is temporarily unavailable. Please check back soon.</p> : null}
        {!pending && payment?.campaign.applicationOpen && payment?.checkoutEnabled ? <label className="mt-5 block max-w-sm text-sm font-medium text-[#514B45]">Billing country
          <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-[#D8CBBE] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]">
            <option value="">Select your country</option>
            {billingCountries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
        </label> : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          {error && !pending ? <button type="button" disabled={busy} onClick={() => void refresh()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D8CBBE] px-4 text-sm font-medium text-[#514B45] hover:bg-[#FAF8F5] disabled:opacity-60"><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry payment check</button> : null}
          {pending && resumeUrl ? <a href={resumeUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171412] px-5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">Resume secure checkout <ArrowRight className="h-4 w-4" aria-hidden="true" /></a> : null}
          {!pending && payment?.campaign.applicationOpen && payment.checkoutEnabled ? <button type="button" disabled={!countryCode || startingCheckout} onClick={() => void startCheckout()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] px-5 text-sm font-semibold text-[#171412] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55">{startingCheckout ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}{startingCheckout ? 'Opening secure checkout…' : 'Continue to Bachs checkout'} {!startingCheckout ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}</button> : null}
          {pending ? <button type="button" disabled={busy} onClick={() => void refresh(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-[#625B52] hover:bg-[#F7F6F4] disabled:opacity-60">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}Check payment status</button> : null}
        </div>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#716B62]"><BadgeCheck className="h-4 w-4 shrink-0 text-[#39754A]" aria-hidden="true" />Payment is separate from your award fee. Payment enables editorial review; it does not guarantee publication.</p>
      </div>
    </section>
  )
}
