'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Loader2, Search, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileCaptcha } from '@/components/ui/turnstile'
import LegalConsent from '@/app/components/LegalConsent'
import { supabase } from '@/lib/supabase/client'

type Awardee = {
  id: string
  name: string
  country: string | null
  course: string | null
  emailHint: string | null
}

const PENDING_KEY = 'afl:pending-claim'

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Awardee[]>([])
  const [selected, setSelected] = useState<Awardee | null>(null)
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hasSession, setHasSession] = useState(false)
  const captchaUnavailable = process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const visibleResults = query.trim().length < 2 ? [] : results

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(PENDING_KEY) || 'null') as { selected: Awardee; email: string } | null
      if (saved?.selected?.id && saved.email) {
        queueMicrotask(() => {
          setSelected(saved.selected)
          setEmail(saved.email)
          setStep(2)
        })
      }
    } catch { /* storage is optional */ }
    void supabase.auth.getUser().then(({ data }) => setHasSession(Boolean(data.user?.email_confirmed_at)))
  }, [])

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await fetch(`/api/auth/claim-directory?q=${encodeURIComponent(text)}`, { signal: controller.signal })
        const body = await response.json()
        if (!response.ok) throw new Error(body.message || 'Could not search winners.')
        setResults(body.awardees ?? [])
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not search winners.')
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query])

  function choose(awardee: Awardee) {
    setSelected(awardee)
    setStep(2)
    setError('')
    setNotice('')
  }

  async function finishClaim(accessToken: string) {
    if (!selected) throw new Error('Choose your record first.')
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ awardeeId: selected.id, inviteCode }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'Could not claim your profile.')
    window.localStorage.removeItem(PENDING_KEY)
    window.localStorage.setItem('afl:welcome-name', selected.name)
    router.push('/dashboard?welcome=1')
    router.refresh()
  }

  async function requestVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || busy) return
    setBusy(true)
    setError('')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const response = await fetch('/api/auth/claim-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId: selected.id, email: normalizedEmail, inviteCode, captchaToken: captcha }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'Could not verify this record.')
      const { data: sessionData } = await supabase.auth.getSession()
      const { data: userData } = await supabase.auth.getUser()
      if (sessionData.session?.access_token && userData.user?.email_confirmed_at && userData.user.email?.toLowerCase() === normalizedEmail) {
        setHasSession(true)
        await finishClaim(sessionData.session.access_token)
        return
      }
      window.localStorage.setItem(PENDING_KEY, JSON.stringify({ selected, email: normalizedEmail }))
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/signup` },
      })
      if (sendError) throw sendError
      setStep(3)
      setNotice(`We sent a verification email to ${normalizedEmail}. Enter its code, or open its link and return here.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send your verification code.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyAndClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || busy) return
    setBusy(true)
    setError('')
    try {
      if (password && password.length < 8) throw new Error('Choose a password of at least 8 characters, or leave it blank to keep your current password.')
      let accessToken: string | undefined
      if (hasSession) {
        const { data: existing } = await supabase.auth.getSession()
        const { data: user } = await supabase.auth.getUser()
        if (user.user?.email?.toLowerCase() !== email.trim().toLowerCase() || !user.user.email_confirmed_at) {
          throw new Error('Sign in with the email on your winner record first.')
        }
        accessToken = existing.session?.access_token
      } else {
        if (!otp.trim()) throw new Error('Enter the verification code from your email.')
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim().toLowerCase(), token: otp.trim(), type: 'email',
        })
        if (verifyError || !data.session?.access_token) throw verifyError || new Error('Could not verify your email code.')
        accessToken = data.session.access_token
      }
      if (!accessToken) throw new Error('Your sign-in session expired. Verify your email again.')
      // Existing accounts can verify by email OTP. Keep their current password
      // unless they explicitly choose a new one while claiming the record.
      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({ password })
        if (passwordError) throw passwordError
      }
      await finishClaim(accessToken)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not finish your claim.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-[#fcfaf7] px-4 py-10 text-[#211a15] sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
        <div className="pt-4">
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-orange-800">AFL winners</span>
          <h1 className="mt-7 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Your story is already here.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-600">Find your winner record, verify your email, and enter your account with your profile details ready.</p>
          <p className="mt-7 text-sm text-stone-600">Already have an account? <Link className="font-semibold text-orange-800 underline" href="/login">Sign in</Link>, then return here to claim your record.</p>
        </div>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8" aria-label="Claim your winner profile">
          <div className="mb-7 flex items-center justify-between gap-3 border-b border-stone-100 pb-5">
            <div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Step {step} of 3</p><h2 className="mt-1 text-2xl font-semibold">{step === 1 ? 'Find yourself' : step === 2 ? 'Confirm your identity' : 'Verify your email'}</h2></div>
            <ShieldCheck className="h-7 w-7 text-orange-700" aria-hidden="true" />
          </div>
          {selected && step > 1 && <div className="mb-6 rounded-2xl bg-orange-50 p-4"><p className="font-semibold">{selected.name}</p><p className="text-sm text-stone-600">{[selected.country, selected.course].filter(Boolean).join(' · ')}</p></div>}
          {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="mb-5 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

          {step === 1 && <div className="space-y-5">
            <div><Label htmlFor="winner-search">Your name</Label><div className="relative mt-2"><Search className="absolute left-3 top-3 h-5 w-5 text-stone-400" /><Input id="winner-search" value={query} onChange={(event) => { setQuery(event.target.value); setError('') }} placeholder="Search the winners list" className="h-12 pl-10" /></div></div>
            {searching && <p className="text-sm text-stone-500">Searching…</p>}
            <div className="max-h-80 space-y-2 overflow-y-auto" aria-live="polite">
              {visibleResults.map((awardee) => <button type="button" key={awardee.id} onClick={() => choose(awardee)} className="flex w-full items-center justify-between rounded-xl border border-stone-200 p-4 text-left hover:border-orange-400 hover:bg-orange-50"><span><strong className="block">{awardee.name}</strong><small className="text-stone-600">{[awardee.country, awardee.course].filter(Boolean).join(' · ')}</small></span><ArrowRight className="h-5 w-5 shrink-0 text-orange-700" /></button>)}
              {query.trim().length >= 2 && !searching && !visibleResults.length && !error && <p className="text-sm text-stone-600">No unclaimed winner found. Check your name or contact the admin team.</p>}
            </div>
          </div>}

          {step === 2 && <form onSubmit={requestVerification} className="space-y-5">
            <div><Label htmlFor="claim-email">Email on your winner record</Label><Input id="claim-email" className="mt-2 h-12" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />{selected?.emailHint && <p className="mt-1 text-xs text-stone-500">On file: {selected.emailHint}</p>}</div>
            <div><Label htmlFor="claim-code">Invite code from the AFL team</Label><Input id="claim-code" className="mt-2 h-12" required value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="AFL-XXXXX-XXXXX" /></div>
            <LegalConsent id="claim-legal-consent" />
            <TurnstileCaptcha action="signup" onVerify={setCaptcha} onExpire={() => setCaptcha('')} onError={() => setCaptcha('')} />
            {captchaUnavailable && <p role="alert" className="text-sm text-red-800">The security check is unavailable. Please try again shortly.</p>}
            <div className="flex justify-between gap-3"><Button type="button" variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button disabled={busy || captchaUnavailable || (Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !captcha)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continue<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </form>}

          {step === 3 && <form onSubmit={verifyAndClaim} className="space-y-5">
            <p className="text-sm leading-6 text-stone-600">{hasSession ? 'Your email is verified.' : <>Enter the code we sent to <strong>{email}</strong>.</>} You can set a password now if you need one for future sign in.</p>
            {!hasSession && <div><Label htmlFor="email-code">Email verification code</Label><Input id="email-code" className="mt-2 h-12" required value={otp} onChange={(event) => setOtp(event.target.value)} autoComplete="one-time-code" inputMode="numeric" /></div>}
            <div><Label htmlFor="claim-password">New sign-in password <span className="font-normal text-stone-500">(optional)</span></Label><Input id="claim-password" className="mt-2 h-12" minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><p className="mt-1 text-xs text-stone-500">Leave blank to keep your current password. You can set one later from sign in recovery.</p></div>
            <div className="flex justify-between gap-3"><Button type="button" variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Claim my profile<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </form>}
        </section>
      </div>
    </main>
  )
}
