'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, BadgeCheck, CheckCircle2, CreditCard, Loader2, RefreshCw } from 'lucide-react'
import { getCountries } from 'libphonenumber-js/min'

import type { AwardPaymentCurrency } from '@/lib/payments/bachs/types'
import { magazinePaymentScreen } from '@/lib/magazine/payment-flow'
type CheckoutMember = { name: string; email: string; location: string }

type PaymentView = {
  campaign: { title: string; description: string; ngnAmountMinor: number; usdAmountMinor: number; applicationOpen: boolean }
  checkoutEnabled: boolean
  orderStatus: string
  applicationEligible: boolean
  currentAttempt: { id: string; status: string; currency: string; amountMinor: number; expiresAt: string | null; checkoutUrl?: string } | null
}

function priceLabel(amountMinor: number, currency: AwardPaymentCurrency) {
  return new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountMinor / 100)
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const billingCountries = getCountries().map((code) => ({ code, name: countryNames.of(code) || code })).sort((a, b) => {
  if (a.code === 'NG') return -1
  if (b.code === 'NG') return 1
  return a.name.localeCompare(b.name)
})

function countryFromLocation(location: string) {
  const normalized = location.trim().toLowerCase()
  return billingCountries.find(({ code, name }) => normalized === code.toLowerCase() || normalized === name.toLowerCase() || normalized.endsWith(`, ${name.toLowerCase()}`))?.code ?? ''
}

export function MagazinePaymentGate({ children, member }: { children: ReactNode; member: CheckoutMember }) {
  const [payment, setPayment] = useState<PaymentView | null>(null)
  const [name, setName] = useState(member.name)
  const [email, setEmail] = useState(member.email)
  const [countryCode, setCountryCode] = useState(() => countryFromLocation(member.location))
  const [loading, setLoading] = useState(true)
  const [returnedFromPayment, setReturnedFromPayment] = useState(false)
  const [confirmationAccepted, setConfirmationAccepted] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [starting, setStarting] = useState(false)
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

  async function checkout() {
    setStarting(true)
    setError('')
    try {
      const response = await fetch('/api/member/magazine/payment/checkout', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, email, countryCode }),
      })
      const payload = await response.json()
      if (!response.ok || typeof payload.checkoutUrl !== 'string') throw new Error(payload.message || 'Could not start checkout.')
      window.location.assign(payload.checkoutUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start checkout.')
      setStarting(false)
    }
  }

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
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-5 w-5" aria-hidden="true" /></span>
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

  const busy = starting || refreshing
  const pending = payment?.orderStatus === 'pending' || payment?.currentAttempt?.status === 'open' || payment?.currentAttempt?.status === 'creating'
  const resumeUrl = payment?.currentAttempt?.checkoutUrl
  const selectedCurrency: AwardPaymentCurrency | null = countryCode ? countryCode === 'NG' ? 'NGN' : 'USD' : null
  const activeCurrency = payment?.currentAttempt?.currency === 'NGN' || payment?.currentAttempt?.currency === 'USD' ? payment.currentAttempt.currency : null
  const currency = pending ? activeCurrency : selectedCurrency
  const amountMinor = pending && activeCurrency
    ? payment?.currentAttempt?.amountMinor
    : currency === 'NGN'
      ? payment?.campaign.ngnAmountMinor
      : currency === 'USD'
        ? payment?.campaign.usdAmountMinor
        : undefined

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#E8DED3] bg-white" aria-labelledby="magazine-payment-title">
      <div className="h-1 bg-gradient-to-r from-[#F36D21] to-[#F5A313]" aria-hidden="true" />
      <div className="p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF2E8] text-[#943A0A]"><CreditCard className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A4619]">Separate magazine fee</p><h2 id="magazine-payment-title" className="mt-1 text-xl font-medium tracking-tight text-[#171412]">{payment?.campaign.title ?? 'Magazine feature application'}</h2><p className="mt-2 text-sm leading-6 text-[#625B52]">{payment?.campaign.description ?? 'A separate payment is required before you can submit your feature application.'}</p></div>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void checkout() }}>
          {pending ? <p role="status" className="mt-5 rounded-xl bg-[#F8F5F1] px-4 py-3 text-sm leading-6 text-[#625B52]">Your payment is being confirmed. Continue in the open secure checkout; its currency and details are fixed.</p> : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0 text-sm font-medium text-[#352A20]" htmlFor="magazine-name">Full name
              <input id="magazine-name" name="name" autoComplete="name" required minLength={2} maxLength={120} disabled={Boolean(pending)} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 min-h-12 w-full min-w-0 rounded-xl border border-[#D8CBBE] bg-white px-3 text-sm text-[#25211D] outline-none transition focus:border-[#A94412] focus:ring-2 focus:ring-[#F36D21]/25 disabled:bg-[#F8F5F1]" />
            </label>
            <label className="block min-w-0 text-sm font-medium text-[#352A20]" htmlFor="magazine-email">Email address
              <input id="magazine-email" name="email" type="email" autoComplete="email" required maxLength={320} disabled={Boolean(pending)} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 min-h-12 w-full min-w-0 rounded-xl border border-[#D8CBBE] bg-white px-3 text-sm text-[#25211D] outline-none transition focus:border-[#A94412] focus:ring-2 focus:ring-[#F36D21]/25 disabled:bg-[#F8F5F1]" />
            </label>
            <label className="block min-w-0 text-sm font-medium text-[#352A20] sm:col-span-2" htmlFor="magazine-country">Country
              <select id="magazine-country" name="country" autoComplete="country-name" required disabled={Boolean(pending)} value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="mt-1.5 min-h-12 w-full min-w-0 rounded-xl border border-[#D8CBBE] bg-white px-3 text-sm text-[#25211D] outline-none transition focus:border-[#A94412] focus:ring-2 focus:ring-[#F36D21]/25 disabled:bg-[#F8F5F1]">
                <option value="">Select your country</option>
                {billingCountries.map(({ code, name: countryName }) => <option key={code} value={code}>{countryName}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#E8DED3] bg-[#FFF8F1] px-4 py-3" aria-live="polite">
            <span className="min-w-0"><span className="block text-xs font-medium text-[#716B62]">{pending ? 'Active checkout amount' : currency ? `${countryCode === 'NG' ? 'Nigeria · Nigerian naira' : `${billingCountries.find((country) => country.code === countryCode)?.name ?? 'International'} · US dollars`}` : 'Your country sets your payment currency'}</span><span className="mt-1 block text-lg font-medium tabular-nums text-[#25211D]">{currency && amountMinor ? priceLabel(amountMinor, currency) : '—'}</span></span>
            <span className="shrink-0 text-xs font-medium text-[#716B62]">{currency ?? 'Select country'}</span>
          </div>
        {error ? <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        {payment?.checkoutEnabled === false && payment?.orderStatus !== 'paid' ? <p className="mt-4 text-sm text-[#716B62]">Magazine payments are not open yet. Please check back later.</p> : null}
        {payment?.checkoutEnabled !== false && !payment?.campaign.applicationOpen && payment?.orderStatus !== 'paid' ? <p className="mt-4 text-sm text-[#716B62]">This campaign is closed to new payments.</p> : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          {error && !pending ? <button type="button" disabled={busy} onClick={() => void refresh()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D8CBBE] px-4 text-sm font-medium text-[#514B45] hover:bg-[#FAF8F5] disabled:opacity-60"><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry payment check</button> : null}
          {pending && resumeUrl ? <a href={resumeUrl} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171412] px-5 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">Resume secure checkout <ArrowRight className="h-4 w-4" aria-hidden="true" /></a> : null}
          {!pending && payment?.checkoutEnabled !== false && payment?.campaign.applicationOpen ? <button type="submit" disabled={busy || !currency} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F36D21] to-[#F5A313] px-5 text-sm font-semibold text-[#171412] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{starting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}{starting ? 'Opening secure checkout…' : currency && amountMinor ? `Pay ${priceLabel(amountMinor, currency)} and continue` : 'Select your country to continue'}</button> : null}
          {pending ? <button type="button" disabled={busy} onClick={() => void refresh(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-[#625B52] hover:bg-[#F7F6F4] disabled:opacity-60">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}Check payment status</button> : null}
        </div>
        </form>
        <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#716B62]"><BadgeCheck className="h-4 w-4 shrink-0 text-[#39754A]" aria-hidden="true" />Payment is separate from your award fee. Payment enables editorial review; it does not guarantee publication.</p>
      </div>
    </section>
  )
}
