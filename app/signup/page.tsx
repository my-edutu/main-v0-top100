'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, Search, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileCaptcha } from '@/components/ui/turnstile'
import LegalConsent from '@/app/components/LegalConsent'
import { createTimedFetch } from '@/lib/network/fetch-with-timeout'
import { supabase } from '@/lib/supabase/client'
import { AuthHelpDialog } from '@/components/auth/auth-help-dialog'

type Awardee = {
  id: string
  name: string
  country: string | null
  course: string | null
  emailHint: string | null
  hasAccount?: boolean
}

const requestAdminCode = 'mailto:info@top100afl.com?subject=Awardee%20signup%20code%20request'

export default function SignUpPage() {
  const [stage, setStage] = useState<'record' | 'code' | 'setup'>('record')
  const heading = useRef<HTMLHeadingElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Awardee[]>([])
  const [selected, setSelected] = useState<Awardee | null>(null)
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
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
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const actionDisabled = busy || sendingCode || captchaUnavailable || (captchaRequired && !captcha)
  const searchText = query.trim()
  const waiting = searchText.length >= 2 && (searching || searchedQuery !== searchText)
  const visibleResults = searchedQuery === searchText ? results : []
  const lookingUpRecord = stage === 'record' && !selected
  const title = submitted ? 'Request submitted'
    : stage === 'setup' ? 'Finish setting up'
    : stage === 'code' ? codeSent ? 'Check your email' : 'Enter your authorization code'
    : selected ? 'Confirm your email' : 'Find your awardee record'

  useEffect(() => {
    if (selected || submitted) heading.current?.focus()
  }, [selected, stage, submitted])

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
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setError('')
    setNotice('')
    setCodeSent(false)
    setInviteCode('')
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || sendingCode || accountMismatch) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    if (submitter instanceof HTMLButtonElement && submitter.value === 'invite') {
      setCodeSent(false)
      changeStage('code')
      return
    }
    if (actionDisabled) return
    setSendingCode(true)
    setError('')
    setNotice('')
    const token = captcha
    setCaptcha('')
    try {
      const response = await createTimedFetch(fetch, 45_000)('/api/auth/claim-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-code', awardeeId: selected.id, email, captchaToken: token }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok || !body.sent) throw new Error(body.message || body.error || 'Could not email your signup code.')
      setCodeSent(true)
      setStage('code')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not email your signup code.')
    } finally {
      setCaptchaKey(value => value + 1)
      setSendingCode(false)
    }
  }

  function changeStage(next: typeof stage) {
    setError('')
    setNotice('')
    setCaptcha('')
    setCaptchaKey(value => value + 1)
    setStage(next)
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
    if (!selected || actionDisabled) return
    setBusy(true)
    setError('')
    setNotice('')
    let captchaAttempted = false
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const { data: sessionData } = await supabase.auth.getSession()
      const { data: userData } = await supabase.auth.getUser()
      setSignedInEmail(userData.user?.email?.trim().toLowerCase() || null)
      if (userData.user && userData.user.email?.trim().toLowerCase() !== normalizedEmail) {
        throw new Error('This browser is signed in to a different account. Sign out below to continue with the email on your winner record.')
      }
      if (!userData.user && password.length < 8) throw new Error('Choose a password of at least 8 characters.')
      const token = captcha
      setCaptcha('')
      captchaAttempted = true
      const response = await createTimedFetch(fetch, 25_000)('/api/auth/claim-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId: selected.id, email: normalizedEmail, inviteCode, captchaToken: token, password: userData.user ? undefined : password }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (response.status === 403 && /signup code/.test(body.message ?? '')) setStage('code')
        throw new Error(body.message || body.error || 'Could not verify this record.')
      }
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
      // Siteverify consumes the token even if eligibility checks fail afterward.
      if (captchaAttempted) setCaptchaKey(value => value + 1)
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
    <main className="min-h-[calc(100dvh-5rem)] bg-[#fcfaf7] px-4 py-8 text-[#211a15] sm:px-6 sm:py-14">
      <section className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-5 sm:p-8" aria-labelledby="signup-title">
        {!submitted && <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-orange-800">Step {stage === 'record' ? 1 : 2} of 2</p>}
        <h1 ref={heading} tabIndex={-1} id="signup-title" className="text-3xl font-semibold tracking-tight focus:outline-none">{title}</h1>
        <div className="mt-6 space-y-5">
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</p>}

          {lookingUpRecord && <div className="space-y-5">
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

          {lookingUpRecord && <p className="text-sm text-stone-600">
            Already registered? <Link href="/login" className="font-semibold text-orange-800 underline">Sign in</Link>
            {' · '}<Link href="/auth/forgot-password?area=member" className="font-semibold text-orange-800 underline">Reset password</Link>
          </p>}

          {!submitted && accountMismatch && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm text-amber-950">You’re signed in with a different email. Sign out to continue with the email on your awardee record.</p>
            <Button type="button" variant="outline" className="mt-3 min-h-11" disabled={signingOut} onClick={() => void signOutToContinue()}>
              {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
              {signingOut ? 'Signing out…' : 'Sign out and continue'}
            </Button>
          </div>}

          {stage === 'record' && selected && <>
            <p className="break-words text-sm text-stone-600">Awardee record for <strong className="font-semibold text-stone-900">{selected.name}</strong></p>
            {selected.emailHint === null ? (
              <p className="text-sm leading-6 text-stone-600">This record has no email on file. <a className="font-semibold text-orange-800 underline" href="mailto:info@top100afl.com?subject=Help%20claiming%20my%20awardee%20record">Contact the AFL team</a> to update it.</p>
            ) : (
              <form onSubmit={sendCode} className="space-y-5">
                <div>
                  <Label htmlFor="claim-email">Email on your awardee record</Label>
                  <Input id="claim-email" className="mt-2 h-12" type="email" required autoComplete="email" value={email} disabled={sendingCode} onChange={(event) => {
                    setEmail(event.target.value)
                    setCodeSent(false)
                    setInviteCode('')
                    setPassword('')
                    setShowPassword(false)
                    setError('')
                    setNotice('')
                  }} placeholder="you@example.com" aria-describedby="claim-email-help" />
                  <p id="claim-email-help" className="mt-2 text-sm text-stone-600">On file: {selected.emailHint}</p>
                </div>
                {!accountMismatch && <>
                  <TurnstileCaptcha key={captchaKey} action="signup" onVerify={setCaptcha} onExpire={() => setCaptcha('')} onError={() => setCaptcha('')} />
                  {captchaUnavailable && <p role="alert" className="text-sm text-red-800">The security check is unavailable. Please try again shortly.</p>}
                  <Button className="h-12 w-full" disabled={actionDisabled || !email.trim()}>
                    {sendingCode && <Loader2 className="animate-spin" />}
                    {sendingCode ? 'Sending your code…' : 'Continue'}
                    {!sendingCode && <ArrowRight />}
                  </Button>
                  <button type="submit" value="invite" disabled={sendingCode} className="min-h-11 text-sm font-semibold text-orange-800 underline disabled:opacity-50">I already have an AFL invite code</button>
                </>}
              </form>
            )}
            <Button type="button" variant="ghost" className="min-h-11 px-0" disabled={sendingCode} onClick={() => {
              changeStage('record')
              setSelected(null)
            }}><ArrowLeft />Back to search</Button>
          </>}

          {stage === 'code' && !accountMismatch && <>
            {codeSent && <p className="break-words text-sm leading-6 text-stone-600">
              Your authorization code has been sent to <strong className="font-semibold text-stone-900">{email.trim()}</strong>. It expires in one hour.
            </p>}
            <form className="space-y-5" onSubmit={(event) => {
              event.preventDefault()
              if (inviteCode.trim()) changeStage('setup')
            }}>
              <div>
                <Label htmlFor="claim-code">Authorization code</Label>
                <Input id="claim-code" className="mt-2 h-12" required autoComplete="one-time-code" autoCapitalize="characters" spellCheck={false} value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="AFL-XXXXX-XXXXX" />
              </div>
              <Button className="h-12 w-full" disabled={!inviteCode.trim()}>Continue <ArrowRight /></Button>
            </form>
            <p className="text-sm leading-6 text-stone-600">Didn’t get the code? <a className="font-semibold text-orange-800 underline" href={requestAdminCode}>Request from admin</a>.</p>
          </>}
          {stage === 'code' && <Button type="button" variant="ghost" className="min-h-11 px-0" onClick={() => changeStage('record')}><ArrowLeft />Back to email</Button>}

          {stage === 'setup' && !submitted && !accountMismatch && <form onSubmit={requestClaim} className="space-y-5">
            {!hasSession && <div>
              <Label htmlFor="claim-password">Choose a sign-in password</Label>
              <div className="relative mt-2">
                <Input id="claim-password" className="h-12 pr-12" required minLength={8} maxLength={72} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" className="absolute right-1 top-0 flex h-12 w-11 items-center justify-center rounded text-stone-500 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} aria-controls="claim-password">
                  {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </div>
              <p className="mt-2 text-sm text-stone-600">Already have an account? Use your current password or <Link href="/auth/forgot-password?area=member" className="font-semibold text-orange-800 underline">reset it</Link>.</p>
            </div>}
            <LegalConsent id="claim-legal-consent" />
            <TurnstileCaptcha key={captchaKey} action="signup" onVerify={setCaptcha} onExpire={() => setCaptcha('')} onError={() => setCaptcha('')} />
            {captchaUnavailable && <p role="alert" className="text-sm text-red-800">The security check is unavailable. Please try again shortly.</p>}
            <Button className="h-12 w-full" disabled={actionDisabled}>{busy && <Loader2 className="animate-spin" />}Submit for review</Button>
          </form>}
          {stage === 'setup' && !submitted && <Button type="button" variant="ghost" className="min-h-11 px-0" disabled={busy} onClick={() => changeStage('code')}><ArrowLeft />Edit code</Button>}
          {submitted && <Link className="text-sm font-semibold text-orange-800 underline" href="/dashboard">Go to dashboard</Link>}
          {lookingUpRecord && <div className="border-t border-stone-100 pt-4"><AuthHelpDialog /></div>}
        </div>
      </section>
    </main>
  )
}
