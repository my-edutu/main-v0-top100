'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Loader2, Search } from 'lucide-react'
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

export default function SignUpPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Awardee[]>([])
  const [selected, setSelected] = useState<Awardee | null>(null)
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hasSession, setHasSession] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const captchaUnavailable = process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const visibleResults = query.trim().length < 2 ? [] : results

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setHasSession(Boolean(data.user)))
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

  async function submitClaim(accessToken: string) {
    if (!selected) throw new Error('Choose your record first.')
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ awardeeId: selected.id, inviteCode }),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(body.message || 'Could not claim your profile.')
    finishPending()
  }

  function finishPending() {
    setSubmitted(true)
    setNotice('Your request is pending admin review. You can sign in while you wait.')
  }

  async function requestClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || busy) return
    setBusy(true)
    setError('')
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const { data: sessionData } = await supabase.auth.getSession()
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user && userData.user.email?.toLowerCase() !== normalizedEmail) {
        throw new Error('Sign out first, or use the email on your current account.')
      }
      if (!userData.user && password.length < 8) throw new Error('Choose a password of at least 8 characters.')
      const response = await fetch('/api/auth/claim-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId: selected.id, email: normalizedEmail, inviteCode, captchaToken: captcha, password: userData.user ? undefined : password }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'Could not verify this record.')
      if (sessionData.session?.access_token && userData.user?.email?.toLowerCase() === normalizedEmail) {
        setHasSession(true)
        await submitClaim(sessionData.session.access_token)
        return
      }
      if (!body.created) throw new Error('Could not submit this claim. Try again.')
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (signInError) throw new Error('Your claim was submitted, but sign-in failed. Sign in with your new password to check its status.')
      setHasSession(true)
      finishPending()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit your claim.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-[#fcfaf7] px-4 py-10 text-[#211a15] sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
        <div className="pt-4">
          <h1 className="mt-0 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Your story is already here.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-600">Find your winner record, enter your AFL code, and request access. The admin team will review your claim.</p>
        </div>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8" aria-label="Claim your winner profile">
          <div className="mb-7 flex items-center justify-between gap-3 border-b border-stone-100 pb-5">
            <div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Step {step} of 2</p><h2 className="mt-1 text-2xl font-semibold">{step === 1 ? 'Find yourself' : 'Request your profile'}</h2></div>
            <Image src="/illustrations/winner-record.svg" alt="" aria-hidden="true" width={48} height={48} className="h-12 w-12 shrink-0" />
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

          {step === 2 && !submitted && <form onSubmit={requestClaim} className="space-y-5">
            <div><Label htmlFor="claim-email">Email on your winner record</Label><Input id="claim-email" className="mt-2 h-12" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />{selected?.emailHint && <p className="mt-1 text-xs text-stone-500">On file: {selected.emailHint}</p>}</div>
            <div><Label htmlFor="claim-code">Invite code from the AFL team</Label><Input id="claim-code" className="mt-2 h-12" required value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="AFL-XXXXX-XXXXX" /></div>
            {!hasSession && <div><Label htmlFor="claim-password">Choose a sign-in password</Label><Input id="claim-password" className="mt-2 h-12" required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>}
            <LegalConsent id="claim-legal-consent" />
            <TurnstileCaptcha action="signup" onVerify={setCaptcha} onExpire={() => setCaptcha('')} onError={() => setCaptcha('')} />
            {captchaUnavailable && <p role="alert" className="text-sm text-red-800">The security check is unavailable. Please try again shortly.</p>}
            <div className="flex justify-between gap-3"><Button type="button" variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button><Button disabled={busy || captchaUnavailable || (Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && !captcha)}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit for review<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
          </form>}
          {submitted && <p className="text-sm text-stone-700">Your requested profile will appear after an admin approves it. <Link className="font-semibold text-orange-800 underline" href="/dashboard">Go to dashboard</Link>.</p>}
        </section>
        <p className="text-sm text-stone-600 lg:col-start-2">Already have an account? <Link className="font-semibold text-orange-800 underline" href="/login">Sign in</Link>, then return here to claim your record.</p>
      </div>
    </main>
  )
}
