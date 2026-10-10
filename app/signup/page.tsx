'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from '@/components/safe-image'
import { ArrowLeft, ArrowRight, Loader2, Search, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileCaptcha } from '@/components/ui/turnstile'
import LegalConsent from '@/app/components/LegalConsent'
import { createTimedFetch } from '@/lib/network/fetch-with-timeout'
import { supabase } from '@/lib/supabase/client'

type Awardee = {
  id: string
  name: string
  country: string | null
  course: string | null
  emailHint: string | null
  hasAccount?: boolean
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
  const [searchedQuery, setSearchedQuery] = useState('')
  const [suggested, setSuggested] = useState(false)
  const [retry, setRetry] = useState(0)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hasSession, setHasSession] = useState(false)
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const captchaUnavailable = process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const searchText = query.trim()
  const waiting = searchText.length >= 2 && (searching || searchedQuery !== searchText)
  const visibleResults = searchedQuery === searchText ? results : []

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user))
      setSignedInEmail(data.user?.email?.trim().toLowerCase() || null)
    })
  }, [])

  const accountMismatch = Boolean(signedInEmail && email.trim() && signedInEmail !== email.trim().toLowerCase())

  useEffect(() => {
    const text = query.trim()
    if (text.length < 2) { setSearching(false); setResults([]); setSearchedQuery(''); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearching(true)
      try {
        const response = await createTimedFetch(fetch, 12_000)(`/api/auth/claim-directory?q=${encodeURIComponent(text)}`, { signal: controller.signal })
        const body = await response.json()
        if (!response.ok) throw new Error(body.message || body.error || 'Could not search winners. Please try again.')
        if (!controller.signal.aborted) { setResults(body.awardees ?? []); setSuggested(Boolean(body.suggested)); setSearchedQuery(text) }
      } catch (cause) {
        if (!controller.signal.aborted) { setResults([]); setSearchedQuery(text); setError(cause instanceof Error ? cause.message : 'Could not search winners. Please try again.') }
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 300)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [query, retry])

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
      setSignedInEmail(userData.user?.email?.trim().toLowerCase() || null)
      if (userData.user && userData.user.email?.trim().toLowerCase() !== normalizedEmail) {
        throw new Error('This browser is signed in to a different account. Sign out below to continue with the email on your winner record.')
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
      if (body.existing) {
        const { data: existing, error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (signInError || !existing.session?.access_token) {
          throw new Error('This email already has an account. Sign in with its current password. Use Reset password below if you have forgotten it.')
        }
        setHasSession(true)
        await submitClaim(existing.session.access_token)
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

  async function signOutToContinue() {
    if (signingOut) return
    setSigningOut(true)
    setError('')
    setNotice('')
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      setHasSession(false)
      setSignedInEmail(null)
      setNotice('You’re signed out. Your selected winner profile and details are still here; continue with the email on that record.')
    } catch {
      setError('Could not sign out of this account. Please sign out, then return here to continue your claim.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-[#fcfaf7] px-4 py-10 text-[#211a15] sm:px-6">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.8fr_1fr] lg:gap-20">
        <div className="pt-4">
          <h1 className="mt-0 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Find your awardee profile.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-stone-600">Find your name to create an account.</p>
        </div>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8" aria-label="Claim your winner profile">
          <div className="mb-7 flex items-center justify-between gap-3 border-b border-stone-100 pb-5">
            <div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">Step {step} of 2</p><h2 className="mt-1 text-2xl font-semibold">{step === 1 ? 'Search your name' : 'Request your profile'}</h2></div>
            <Image src="/illustrations/winner-record.svg" alt="" aria-hidden="true" width={48} height={48} className="h-12 w-12 shrink-0" />
          </div>
          {selected && step > 1 && <div className="mb-6 rounded-2xl bg-orange-50 p-4"><p className="font-semibold">{selected.name}</p><p className="text-sm text-stone-600">{[selected.country, selected.course].filter(Boolean).join(' · ')}</p></div>}
          {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="mb-5 rounded-xl bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

          {step === 1 && <div className="space-y-5">
            <div><Label htmlFor="winner-search">Your name</Label><div className="relative mt-2"><Search className="absolute left-3 top-3 h-5 w-5 text-stone-400" /><Input id="winner-search" value={query} onChange={(event) => { setQuery(event.target.value); setError('') }} placeholder="Try your first name or surname" className="h-12 pl-10" aria-describedby="search-help" /></div><p id="search-help" className="mt-2 text-sm text-stone-600">Type at least 2 letters. Try one name at a time.</p></div>
            {waiting && <p role="status" className="flex items-center gap-2 text-sm text-stone-500"><Loader2 className="h-4 w-4 animate-spin" />Finding your name…</p>}
            {suggested && !waiting && visibleResults.length > 0 && <p className="text-sm text-stone-600">Could one of these be you? Check the name and country.</p>}
            {error && <Button type="button" variant="outline" onClick={() => { setError(''); setSearchedQuery(''); setRetry(value => value + 1) }}>Try search again</Button>}
            <div className="max-h-80 space-y-2 overflow-y-auto" aria-live="polite">
              {!waiting && visibleResults.map((awardee) => awardee.hasAccount ? (
                <Link key={awardee.id} href="/login" className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 p-4 hover:border-orange-400 hover:bg-orange-50"><span><strong className="block">{awardee.name}</strong><small className="text-stone-600">{awardee.country} · Account already created</small></span><span className="shrink-0 text-sm font-semibold text-orange-800">Sign in →</span></Link>
              ) : (
                <button type="button" key={awardee.id} onClick={() => choose(awardee)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-200 p-4 text-left hover:border-orange-400 hover:bg-orange-50"><span><strong className="block">{awardee.name}</strong><small className="text-stone-600">{[awardee.country, awardee.course].filter(Boolean).join(' · ')}</small></span><ArrowRight className="h-5 w-5 shrink-0 text-orange-700" /></button>
              ))}
              {searchText.length >= 2 && !waiting && !visibleResults.length && !error && <div className="rounded-xl bg-orange-50 p-4"><p className="font-semibold">Can’t find your name?</p><p className="mt-1 text-sm text-stone-600">Try just your first name or surname, as written in your award email.</p>{searchText.includes(' ') && <button type="button" className="mt-3 font-semibold text-orange-800 underline" onClick={() => setQuery(searchText.split(/\s+/)[0])}>Search “{searchText.split(/\s+/)[0]}” instead</button>}<p className="mt-3 text-sm">Still missing? <a className="font-semibold text-orange-800 underline" href="mailto:info@top100afl.com?subject=Help%20finding%20my%20awardee%20profile">Contact the team</a>.</p></div>}

            </div>
          </div>}

          {!submitted && accountMismatch && <div className="my-5 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-950">A different account is signed in</p><p className="mt-1 text-sm leading-6 text-amber-900">Sign out to continue this claim with the email on your winner record. Your selected profile and form details will stay here.</p><Button type="button" variant="outline" className="mt-3 border-amber-400 bg-white text-amber-950 hover:bg-amber-100" disabled={signingOut} onClick={() => void signOutToContinue()}>{signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}{signingOut ? 'Signing out…' : 'Sign out and continue'}</Button></div>}
          {!submitted && !accountMismatch && step === 1 && <div className="my-5 rounded-xl border border-stone-200 bg-stone-50 p-4"><p className="text-sm font-semibold">Already registered?</p><p className="mt-1 text-sm text-stone-600">Sign in to continue to your dashboard. If you’re waiting for approval, you can still sign in.</p><div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-orange-800"><Link href="/login" className="underline">Sign in</Link><Link href="/auth/forgot-password?area=member" className="underline">Reset password</Link></div></div>}
          {!submitted && !accountMismatch && step === 2 && <p className="my-5 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">Already have an account? <Link href="/login" className="font-semibold text-orange-800 underline">Sign in</Link> to continue.</p>}

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
      </div>
    </main>
  )
}
