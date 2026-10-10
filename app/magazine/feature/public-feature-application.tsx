'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getCountries } from 'libphonenumber-js/min'
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Campaign = {
  id: string
  title: string
  description: string
  ngnAmountMinor: number
  usdAmountMinor: number
  applicationOpen: boolean
}

type PaymentView = {
  campaign: Campaign
  checkoutEnabled: boolean
  orderStatus: string
  currentAttempt: { status: string; checkoutUrl?: string } | null
  applicationStatus: string | null
  customer?: { name: string | null; email: string | null }
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countries = getCountries().map((code) => ({ code, name: countryNames.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name))

async function readResponse(response: Response) {
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Something went wrong. Please try again.')
  return result
}

export default function PublicFeatureApplication() {
  const [view, setView] = useState<PaymentView | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [applicationBusy, setApplicationBusy] = useState(false)
  const [countryCode, setCountryCode] = useState('NG')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const refresh = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    try {
      const response = await fetch('/api/public/magazine/payment', { cache: 'no-store' })
      const result = await readResponse(response) as PaymentView
      setView(result)
      if (result.customer?.name) setName((current) => current || result.customer?.name || '')
      if (result.customer?.email) setEmail((current) => current || result.customer?.email || '')
      setSubmitted(Boolean(result.applicationStatus))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load magazine payment details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'bio' | 'story' | 'product' | 'project'>('story')
  const [summary, setSummary] = useState('')

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('payment') !== 'done') return
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      void refresh(true)
      if (attempts >= 12) window.clearInterval(timer)
    }, 5_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const price = useMemo(() => {
    if (!view) return null
    const amountMinor = countryCode === 'NG' ? view.campaign.ngnAmountMinor : view.campaign.usdAmountMinor
    const currency = countryCode === 'NG' ? 'NGN' : 'USD'
    return new Intl.NumberFormat(countryCode === 'NG' ? 'en-NG' : 'en-US', { style: 'currency', currency }).format(amountMinor / 100)
  }, [countryCode, view])

  async function startCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCheckoutBusy(true)
    setError('')
    try {
      const response = await fetch('/api/public/magazine/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, countryCode }),
      })
      const result = await readResponse(response) as { checkoutUrl: string }
      window.location.assign(result.checkoutUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start payment.')
      setCheckoutBusy(false)
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplicationBusy(true)
    setError('')
    try {
      await readResponse(await fetch('/api/public/magazine/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, summary }),
      }))
      setSubmitted(true)
      await refresh(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit your application.')
    } finally {
      setApplicationBusy(false)
    }
  }

  const paid = view?.orderStatus === 'paid'
  const pending = ['pending', 'processing'].includes(view?.orderStatus ?? '') || ['open', 'processing', 'creating'].includes(view?.currentAttempt?.status ?? '')

  return (
    <main className="min-h-screen bg-[#f7f5f2] px-4 py-8 text-[#151d2c] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Africa Future Leaders
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#291620] via-[#54221f] to-[#713514] px-6 py-9 text-white sm:px-10 sm:py-12">
            <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-white/15" />
            <div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border border-white/15" />
            <div className="relative max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">Africa Future Leaders · 2026</p>
              <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-5xl">Share the story behind your leadership.</h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/85 sm:text-base">Applications are open to the public. Payment is required for editorial consideration and does not guarantee publication.</p>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {loading ? (
              <div className="flex min-h-48 items-center justify-center text-slate-500"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Loading application details…</div>
            ) : !view ? (
              <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{error || 'Magazine applications are temporarily unavailable.'}</div>
            ) : !view.campaign.applicationOpen && !paid ? (
              <div className="rounded-xl bg-slate-50 p-5 text-slate-700">Applications for this magazine campaign are currently closed.</div>
            ) : submitted ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h2 className="mt-4 text-2xl font-bold text-slate-900">Application received</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Your 2026 magazine feature application is in the editorial review queue. Payment confirms consideration, not publication.</p>
              </div>
            ) : paid ? (
              <form onSubmit={submitApplication} className="space-y-5">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">Payment confirmed</p>
                  <h2 className="mt-2 text-2xl font-bold">Tell us what you would like featured</h2>
                  <p className="mt-2 text-sm text-slate-600">This application is linked to {view.customer?.email || 'the email used at checkout'}.</p>
                </div>
                <div className="space-y-2"><Label htmlFor="feature-title">Feature title</Label><Input id="feature-title" value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={160} required placeholder="A clear title for your story" /></div>
                <div className="space-y-2"><Label htmlFor="feature-category">What best describes your feature?</Label><select id="feature-category" value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="story">Leadership story</option><option value="bio">Professional profile</option><option value="product">Product or business</option><option value="project">Project or initiative</option></select></div>
                <div className="space-y-2"><Label htmlFor="feature-summary">Your work and impact</Label><Textarea id="feature-summary" value={summary} onChange={(event) => setSummary(event.target.value)} minLength={20} maxLength={10_000} required rows={7} placeholder="Describe your work, the impact it has made, and what you would like readers to know." /></div>
                <Button type="submit" className="w-full bg-orange-500 text-slate-950 hover:bg-orange-600" disabled={applicationBusy}>{applicationBusy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Submitting…</> : <>Submit application <ArrowRight className="ml-2 h-4 w-4" /></>}</Button>
              </form>
            ) : (
              <form onSubmit={startCheckout} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">Apply for a magazine feature</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Anyone can apply, including visitors who do not have an Africa Future Leaders account. Enter your details, pay securely, then complete your application.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="customer-name">Full name</Label><Input id="customer-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={120} required /></div>
                  <div className="space-y-2"><Label htmlFor="customer-email">Email address</Label><Input id="customer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={320} required /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="billing-country">Country</Label><select id="billing-country" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></div>
                {price && <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-4"><span className="text-sm font-medium text-slate-700">Editorial consideration fee</span><span className="text-lg font-bold text-slate-900">{price}</span></div>}
                {!view.checkoutEnabled ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">Online payment is temporarily unavailable. Please contact <a className="font-semibold underline underline-offset-2" href="mailto:info@top100afl.com?subject=Magazine%20feature%20payment">info@top100afl.com</a> for help with your application.</div> : null}
                {pending && <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Payment status is being confirmed</p><p className="mt-1">The application form unlocks after Bachs confirms payment. Use the status button below to check again.</p></div></div>}
                {view.orderStatus === 'exception' && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your payment needs support review before you can continue.</div>}
                <Button type="submit" className="w-full bg-orange-500 text-slate-950 hover:bg-orange-600" disabled={checkoutBusy || !view.campaign.applicationOpen || !view.checkoutEnabled}>{checkoutBusy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Opening secure checkout…</> : view.checkoutEnabled ? <>Continue to secure payment <ArrowRight className="ml-2 h-4 w-4" /></> : 'Payment temporarily unavailable'}</Button>
                <p className="text-xs leading-5 text-slate-500">After checkout, return in this browser to finish your application. Need help? <a className="font-semibold text-orange-700 underline underline-offset-2" href="mailto:info@top100afl.com?subject=2026%20Magazine%20Feature%20Application">Contact the team</a>.</p>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Secure checkout · No account required</span><button type="button" onClick={() => void refresh(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-950">{refreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Check payment status</button></div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
