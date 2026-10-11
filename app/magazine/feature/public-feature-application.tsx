'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getCountries } from 'libphonenumber-js/min'
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TurnstileCaptcha } from '@/components/ui/turnstile'

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
  if (!response.ok) throw new Error(result.message || result.error || (response.status === 503 ? 'Payment is temporarily unavailable. Please try again shortly.' : 'Something went wrong. Please try again.'))
  return result
}

export default function PublicFeatureApplication() {
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaVersion, setCaptchaVersion] = useState(0)
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const [view, setView] = useState<PaymentView | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [applicationBusy, setApplicationBusy] = useState(false)
  const [countryCode, setCountryCode] = useState('NG')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [recoveryRequired, setRecoveryRequired] = useState(false)
  const [continueCheckoutAfterCode, setContinueCheckoutAfterCode] = useState(false)
  const [recoveryBusy, setRecoveryBusy] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'bio' | 'story' | 'product' | 'project'>('story')
  const [summary, setSummary] = useState('')

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
      return result
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load magazine payment details.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])



  useEffect(() => {
    const timer = window.setTimeout(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('resume')
    if (!token) { void refresh(); return }
    // The fragment keeps private tokens out of request URLs and referrer headers.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    void (async () => {
      try {
        await readResponse(await fetch('/api/public/magazine/recover', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
        }))
        await refresh()
      } catch (cause) {
        await refresh()
        setRecoveryRequired(true)
        setRecoveryMessage(cause instanceof Error ? cause.message : 'Request a new email code to continue.')
      }
    })()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  async function requestResumeCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    setSendingCode(true)
    setRecoveryBusy(true)
    setError('')
    setRecoveryMessage('')
    try {
      const result = await readResponse(await fetch('/api/public/magazine/recover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      }))
      setRecoveryMessage(result.message)
      setOtpSent(true)
      setOtpCode('')
      setResendSeconds(result.resendAfter ?? 60)
    } catch (cause) {
      setRecoveryMessage(cause instanceof Error ? cause.message : 'Please try again shortly.')
    } finally { setRecoveryBusy(false); setSendingCode(false) }
  }

  useEffect(() => {
    if (!otpSent) return
    const timer = window.setInterval(() => setResendSeconds(seconds => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [otpSent])

  async function verifyResumeCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRecoveryBusy(true)
    setRecoveryMessage('')
    try {
      await readResponse(await fetch('/api/public/magazine/recover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: otpCode }),
      }))
      setView(null)
      const restored = await refresh(true)
      if (!restored) throw new Error('Your email is verified. Please retry loading your payment status.')
      setRecoveryRequired(false)
      setOtpSent(false)
      setOtpCode('')
      if (continueCheckoutAfterCode && ['unpaid', 'failed'].includes(restored.orderStatus)) {
        setContinueCheckoutAfterCode(false)
        await startCheckout()
      } else {
        setContinueCheckoutAfterCode(false)
      }
    } catch (cause) {
      setRecoveryMessage(cause instanceof Error ? cause.message : 'Please check your code and try again.')
    } finally { setRecoveryBusy(false) }
  }

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

  async function startCheckout(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (captchaRequired && !captchaToken) {
      setError('Please complete the security check to continue.')
      return
    }
    setCheckoutBusy(true)
    setError('')
    try {
      const response = await fetch('/api/public/magazine/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, countryCode, captchaToken }),
      })
      setCaptchaToken('')
      setCaptchaVersion(version => version + 1)
      const result = await readResponse(response) as { checkoutUrl?: string; nextStep?: 'recover' | 'refresh' }
      if (result.nextStep === 'recover') {
        setContinueCheckoutAfterCode(true)
        setRecoveryRequired(true)
        setRecoveryMessage('')
        await requestResumeCode()
        setCheckoutBusy(false)
      } else if (result.nextStep === 'refresh') {
        await refresh(true)
        setCheckoutBusy(false)
      } else if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
      } else { throw new Error('Please check your payment status and try again.') }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not start payment.')
      setCheckoutBusy(false)
      setCaptchaToken('')
      setCaptchaVersion(version => version + 1)
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
    <main className="magazine-feature-page min-h-screen bg-[#f7f5f2] px-4 py-8 text-[#151d2c] sm:px-6 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Back to Africa Future Leaders
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5">
          <div className="magazine-feature-hero relative overflow-hidden bg-gradient-to-br from-[#291620] via-[#54221f] to-[#713514] px-6 py-9 text-white sm:px-10 sm:py-12">
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
              <div className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600"><p>{error || 'Magazine applications are temporarily unavailable.'}</p><button type="button" onClick={() => void refresh()} className="mt-3 font-medium text-orange-700 underline underline-offset-4">Reload application details</button></div>
            ) : !view.campaign.applicationOpen && !paid ? (
              <div className="rounded-xl bg-slate-50 p-5 text-slate-700">Applications for this magazine campaign are currently closed.</div>
            ) : recoveryRequired ? (
              <form onSubmit={otpSent ? verifyResumeCode : requestResumeCode} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">{otpSent ? 'Enter your email code' : 'Continue your application'}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{otpSent ? <>Enter the six-digit code sent to <strong className="break-all font-medium">{email}</strong> to return to your application.</> : 'Enter your application email. We’ll send a six-digit code so you can continue right here.'}</p>
                </div>
                {otpSent ? <div className="space-y-2">
                  <Label htmlFor="resume-code">Verification code</Label>
                  <Input id="resume-code" value={otpCode} onChange={event => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required autoFocus aria-describedby="resume-code-hint" className="h-14 text-center font-mono text-2xl tracking-[.35em]" placeholder="000000" />
                  <p id="resume-code-hint" className="text-xs text-slate-500">Paste the full code. It expires in 10 minutes.</p>
                </div> : <div className="space-y-2"><Label htmlFor="resume-email">Email used for your application</Label><Input id="resume-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={320} required /></div>}
                {recoveryMessage && <p role="status" className="rounded-xl bg-orange-50 px-4 py-3 text-sm leading-6 text-slate-700">{recoveryMessage}</p>}
                {otpSent && continueCheckoutAfterCode && <TurnstileCaptcha key={captchaVersion} action="magazine_checkout" onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => { setCaptchaToken(''); setError('The security check could not load. Please retry shortly.') }} />}
                <Button type="submit" className="w-full bg-orange-500 text-white hover:bg-orange-600" disabled={recoveryBusy || (otpSent && otpCode.length !== 6)}>{recoveryBusy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />{sendingCode ? 'Sending your code…' : 'Verifying…'}</> : otpSent ? 'Verify and continue' : 'Send my code'}</Button>
                {otpSent && <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <button type="button" onClick={() => void requestResumeCode()} disabled={recoveryBusy || resendSeconds > 0} className="font-medium text-orange-700 underline underline-offset-4 disabled:text-slate-400 disabled:no-underline">{resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : 'Resend code'}</button>
                  <button type="button" disabled={recoveryBusy} onClick={() => { setOtpSent(false); setOtpCode(''); setRecoveryMessage('') }} className="text-slate-600 underline underline-offset-4">Change email</button>
                </div>}
                <button type="button" disabled={recoveryBusy} onClick={() => { setRecoveryRequired(false); setOtpSent(false); setOtpCode(''); setError(''); setRecoveryMessage('') }} className="text-sm font-medium text-slate-600 underline underline-offset-4">Back to application details</button>
              </form>
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
            ) : ['exception', 'refunded'].includes(view.orderStatus) || pending ? (
              <div role="status" className="space-y-5">
                <ShieldCheck className="h-10 w-10 text-orange-600" />
                <h2 className="text-2xl font-bold">{view.orderStatus === 'refunded' ? 'Your payment was refunded' : view.orderStatus === 'exception' ? 'We’re checking your payment' : view.currentAttempt?.status === 'open' ? 'Continue your payment' : 'Confirming your payment'}</h2>
                <p className="text-sm leading-6 text-slate-600">{view.orderStatus === 'exception' ? 'Your application is saved. Please contact our team to resolve this payment before paying again.' : view.orderStatus === 'refunded' ? 'Contact our team if you would like to continue your application.' : view.currentAttempt?.status === 'open' ? 'Your details are saved. Complete your existing checkout, or check whether payment has been confirmed.' : 'Your details are saved. We’re waiting for the payment provider to confirm your status. Please check again shortly.'}</p>
                {pending && view.currentAttempt?.status === 'open' && view.currentAttempt.checkoutUrl && <Button asChild className="w-full bg-orange-500 text-slate-950 hover:bg-orange-600"><a href={view.currentAttempt.checkoutUrl}>Continue secure payment <ArrowRight className="ml-2 h-4 w-4" /></a></Button>}
                <Button type="button" variant="outline" onClick={() => void refresh(true)} disabled={refreshing} className="w-full">{refreshing ? 'Checking…' : 'Check payment status'}</Button>
                <a href="mailto:info@top100afl.com?subject=Magazine%20payment%20help" className="block text-center text-sm font-semibold text-orange-700 underline">Contact the team</a>
              </div>
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
                {view.checkoutEnabled && <TurnstileCaptcha key={captchaVersion} action="magazine_checkout" onVerify={setCaptchaToken} onExpire={() => setCaptchaToken('')} onError={() => { setCaptchaToken(''); setError('The security check could not load. Please retry shortly.') }} />}
                <Button type="submit" className="w-full bg-orange-500 text-slate-950 hover:bg-orange-600" disabled={checkoutBusy || (captchaRequired && !captchaToken) || !view.campaign.applicationOpen || !view.checkoutEnabled}>{checkoutBusy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Opening secure checkout…</> : view.checkoutEnabled ? <>Continue to secure payment <ArrowRight className="ml-2 h-4 w-4" /></> : 'Payment temporarily unavailable'}</Button>
                <p className="text-xs leading-5 text-slate-500">After checkout, return here to finish your application. Need help? <a className="font-semibold text-orange-700 underline underline-offset-2" href="mailto:info@top100afl.com?subject=2026%20Magazine%20Feature%20Application">Contact the team</a>.</p>
                <button type="button" onClick={() => { setContinueCheckoutAfterCode(false); setRecoveryRequired(true); setError(''); setRecoveryMessage('') }} className="text-sm font-medium text-orange-700 underline underline-offset-4">Already started? Continue your application</button>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Secure checkout · No account required</span><button type="button" onClick={() => void refresh(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-950">{refreshing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Check payment status</button></div>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
