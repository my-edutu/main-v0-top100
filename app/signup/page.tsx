'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import LegalConsent from '@/app/components/LegalConsent'
import { isPersistentAvatarUrl } from '@/lib/auth/claim-directory'
import { TurnstileCaptcha } from '@/components/ui/turnstile'
import { buildSignupPayload } from '@/lib/auth/signup-turnstile'

type DirectoryAwardee = {
  id: string
  name: string
  country: string | null
  course: string | null
  imageUrl: string | null
  emailHint: string | null
}

const STEPS = [
  { id: 1, title: 'Find yourself', icon: UserRoundCheck },
  { id: 2, title: 'Verify identity', icon: ShieldCheck },
  { id: 3, title: 'Secure account', icon: Lock },
] as const

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export default function SignUpPage() {
  const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const captchaUnavailable = process.env.NODE_ENV === 'production' && !captchaEnabled
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState('')

  // Step 1 — directory
  const [directory, setDirectory] = useState<DirectoryAwardee[]>([])
  const [directoryLoading, setDirectoryLoading] = useState(false)
  const [directoryError, setDirectoryError] = useState('')
  const [directoryHasMore, setDirectoryHasMore] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<DirectoryAwardee | null>(null)

  // Step 2 — verification
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  // Step 3 — credentials
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const claimActions = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (captchaToken) claimActions.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [captchaToken])

  useEffect(() => {
    const search = query.trim().replace(/\s+/g, ' ')
    if (search.length < 2) {
      setDirectory([])
      setDirectoryError('')
      setDirectoryHasMore(false)
      setDirectoryLoading(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setDirectoryLoading(true)
      setDirectoryError('')
      try {
        const res = await fetch(`/api/auth/claim-directory?q=${encodeURIComponent(search)}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Could not load the awardee directory.')
        setDirectory(data.awardees ?? [])
        setDirectoryHasMore(Boolean(data.hasMore))
      } catch (err) {
        if (controller.signal.aborted) return
        setDirectoryError(err instanceof Error ? err.message : 'Could not load the awardee directory.')
      } finally {
        if (!controller.signal.aborted) setDirectoryLoading(false)
      }
    }, 300)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  function choose(awardee: DirectoryAwardee) {
    setSelected(awardee)
    setError('')
    setStep(2)
  }

  function handleVerifyStep(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !inviteCode.trim()) {
      setError('Enter your email and the code from the admin team.')
      return
    }
    setStep(3)
  }

  async function handleCreateAccount(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError('')
    const form = event.currentTarget as HTMLFormElement
    const fields = new FormData(form)
    // Read the submitted inputs so browser/password-manager autofill is included.
    const submittedPassword = String(fields.get('password') ?? '')
    const submittedConfirmation = String(fields.get('confirmPassword') ?? '')

    if (submittedPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (submittedPassword !== submittedConfirmation) {
      setError('Passwords do not match.')
      return
    }
    if (fields.get('legalConsent') !== 'on') {
      setError('Please agree to the Terms of Use and Privacy & Data Policy before creating your account.')
      return
    }
    if (!selected) {
      setStep(1)
      return
    }
    if ((captchaEnabled || captchaUnavailable) && !captchaToken) {
      setError('Complete the security check before claiming your profile.')
      return
    }

    const resetCaptcha = () => {
      setCaptchaToken('')
      setCaptchaKey((key) => key + 1)
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSignupPayload({
          awardeeId: selected.id,
          email,
          password: submittedPassword,
          inviteCode,
          captchaToken,
        })),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.message || 'Could not create this account.')
        // Verification problems are fixed on step 2, not here.
        if (response.status === 403 || response.status === 404 || response.status === 409) {
          setStep(2)
        }
        setSubmitting(false)
        resetCaptcha()
        return
      }

      // Auto sign-in so they land in the hub with a real session.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: submittedPassword,
      })

      // One-time welcome celebration on first dashboard visit.
      try {
        window.localStorage.setItem('afl:welcome-name', (data?.name as string) || selected.name)
      } catch {
        // storage unavailable — the ?welcome=1 param still triggers the banner
      }

      if (signInError) {
        window.location.href = '/login?redirect=/dashboard'
        return
      }

      // Let auth cookies settle before the middleware re-checks the session.
      await new Promise((resolve) => setTimeout(resolve, 1000))
      window.location.href = '/dashboard?welcome=1'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create this account.')
      setSubmitting(false)
      resetCaptcha()
    }
  }

  return (
    <main className="min-h-[calc(100dvh-5rem)] bg-[#fcfaf7] px-4 pb-16 pt-6 text-[#1d1b1a] sm:px-6 sm:pt-10 lg:py-16">
      <div className="mx-auto grid max-w-6xl gap-7 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-14 xl:gap-20">
        <div className="min-w-0 lg:pt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 lg:items-start lg:justify-start">
            <span className="inline-flex min-h-8 items-center rounded-full border border-[#f1c49f] bg-[#fff1e6] px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a53d0a]">
              Invite only
            </span>
            <Link href="/login" className="inline-flex min-h-10 items-center text-sm font-medium text-[#8f350d] underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
              Already a member? Sign in <ArrowRight aria-hidden="true" className="ml-1 h-4 w-4" />
            </Link>
          </div>

          <h1 className="mt-5 max-w-[15ch] text-[clamp(2.15rem,5vw,3.7rem)] font-semibold leading-[1.06] tracking-[-0.045em] text-[#201c1a] lg:mt-12">
            Claim your awardee profile.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-6 text-[#625a55] sm:text-base sm:leading-7">
            Find your profile in the Top100 directory, verify your identity with the code from our team, and make it yours.
          </p>
          <div className="mt-7 hidden border-t border-[#e9dcd1] pt-5 text-sm leading-6 text-[#756b63] lg:block">
            Your profile is already in the directory. You&apos;ll need your invite code to finish claiming it.
          </div>
        </div>

        <div className="min-w-0">
        {/* Stepper */}
        <ol aria-label="Claim profile progress" className="grid grid-cols-3 gap-2 sm:gap-3">
          {STEPS.map((s) => {
            const state = step === s.id ? 'current' : step > s.id ? 'done' : 'todo'
            return (
              <li key={s.id} aria-current={state === 'current' ? 'step' : undefined} className={cn('min-w-0 rounded-2xl border px-2 py-2.5 sm:px-3', state === 'current' ? 'border-[#ecaa78] bg-[#fff1e6]' : 'border-[#e9e2da] bg-white')}>
                <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    state === 'done' && 'border-[#c14b14] bg-[#c14b14] text-white',
                    state === 'current' && 'border-[#c14b14] bg-white text-[#a53d0a]',
                    state === 'todo' && 'border-[#ded7d0] bg-white text-[#756b63]'
                  )}
                >
                  {state === 'done' ? <BadgeCheck className="h-4 w-4" /> : s.id}
                </span>
                <span
                  className={cn(
                    'min-w-0 text-[11px] font-medium leading-tight sm:text-xs',
                    state === 'todo' ? 'text-[#756b63]' : 'text-[#382d27]'
                  )}
                >
                  {s.title}
                </span>
                </span>
              </li>
            )
          })}
        </ol>

        <div className="mt-4 rounded-[24px] border border-[#ecded1] bg-white p-5 shadow-[0_18px_48px_-36px_rgba(68,37,18,0.35)] sm:p-7 lg:mt-5 lg:p-8">
            {error ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
              >
                {error}
              </div>
            ) : null}

            {/* STEP 1 — pick yourself from the directory */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a53d0a]">Step 1 of 3</p>
                  <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-[#201c1a]">Find your profile</h2>
                  <p className="mt-1 text-sm leading-6 text-[#625a55]">
                    Search for your name in the awardee directory.
                  </p>
                </div>

                <div className="relative space-y-2">
                  <Label htmlFor="signup-directory-search" className="text-sm font-medium text-[#382d27]">Your full name</Label>
                  <Search className="pointer-events-none absolute left-4 top-[38px] h-5 w-5 text-[#8a8076]" aria-hidden="true" />
                  <Input
                    id="signup-directory-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your full name…"
                    autoComplete="name"
                    className="h-12 rounded-xl border-[#d9cfc5] bg-white pl-12 text-base focus-visible:ring-orange-600"
                  />
                </div>

                <div className="max-h-[min(42vh,320px)] space-y-2 overflow-y-auto pr-1" role="listbox" aria-label="Awardee directory">
                  {directoryLoading && (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading the directory…
                    </div>
                  )}
                  {!directoryLoading && directoryError && (
                    <p className="py-8 text-center text-sm font-medium text-red-600">{directoryError}</p>
                  )}
                  {!directoryLoading && !directoryError && query.trim().length < 2 && (
                    <p className="rounded-xl bg-[#faf6f1] px-4 py-4 text-sm leading-6 text-[#625a55]">
                      Type at least two letters to find your profile.
                    </p>
                  )}
                  {!directoryLoading && !directoryError && query.trim().length >= 2 && directory.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No unclaimed profile matches “{query}”. Already claimed yours?{' '}
                      <Link href="/login" className="font-semibold text-orange-700">
                        Sign in
                      </Link>{' '}
                      — or contact the admin team.
                    </p>
                  )}
                  {!directoryLoading &&
                    directory.map((awardee) => (
                      <button
                        key={awardee.id}
                        type="button"
                        role="option"
                        aria-selected={selected?.id === awardee.id}
                        onClick={() => choose(awardee)}
                        className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-[#e9e2da] bg-white px-3 py-3 text-left transition-colors hover:border-orange-300 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                      >
                        {isPersistentAvatarUrl(awardee.imageUrl) ? (
                          <Image
                            src={awardee.imageUrl}
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                            {initials(awardee.name)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-semibold text-slate-900">{awardee.name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {[awardee.country, awardee.course].filter(Boolean).join(' · ') || 'Top100 awardee'}
                          </span>
                        </span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                      </button>
                    ))}
                  {!directoryLoading && directoryHasMore && (
                    <p className="px-2 py-3 text-center text-xs text-slate-500">
                      Showing the first 25 matches. Add more of your name to narrow the results.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2 — verify email + admin-issued code */}
            {step === 2 && selected && (
              <form onSubmit={handleVerifyStep} className="space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a53d0a]">Step 2 of 3</p>
                  <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-[#201c1a]">Verify it&apos;s you</h2>
                  <p className="mt-1 text-sm leading-6 text-[#625a55]">
                    Confirm the email on record and enter the one-time code issued by the admin team.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {initials(selected.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{selected.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[selected.country, selected.course].filter(Boolean).join(' · ') || 'Top100 awardee'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="ml-auto min-h-11 shrink-0 text-xs font-semibold text-orange-700 underline-offset-4 hover:underline"
                  >
                    Not you?
                  </button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Your email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-12 rounded-xl border-[#d9cfc5] bg-white pl-10 focus-visible:ring-orange-600"
                    />
                  </div>
                  {selected.emailHint && (
                    <p className="text-xs text-slate-500">
                      Hint: the email on record looks like <span className="font-semibold">{selected.emailHint}</span>.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-code">Invite code</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="signup-code"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="AFL-XXXXX-XXXXX"
                      className="h-12 rounded-xl border-[#d9cfc5] bg-white pl-10 uppercase tracking-wider focus-visible:ring-orange-600"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Issued by the Top100 admin team. No code yet? Reach out to your program contact.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)} className="min-h-11 rounded-xl text-slate-600">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="min-h-11 rounded-xl bg-[#ef7b29] px-6 font-semibold text-[#25180f] hover:bg-[#f59a46]">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3 — set a password */}
            {step === 3 && selected && (
              <form noValidate onSubmit={handleCreateAccount} className="space-y-5">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a53d0a]">Step 3 of 3</p>
                  <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-[#201c1a]">Secure your account</h2>
                  <p className="mt-1 text-sm leading-6 text-[#625a55]">
                    Set a password for <span className="font-semibold text-slate-800">{email}</span>. From here on,
                    you control your profile.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-12 rounded-xl border-[#d9cfc5] bg-white focus-visible:ring-orange-600"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm password</Label>
                  <Input
                    id="signup-confirm"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="h-12 rounded-xl border-[#d9cfc5] bg-white focus-visible:ring-orange-600"
                  />
                </div>

                <LegalConsent id="signup-legal-consent" />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4">
                  <p className="mb-3 text-sm font-medium text-slate-700">Security check</p>
                  <TurnstileCaptcha
                    key={captchaKey}
                    action="signup"
                    onVerify={(token) => { setCaptchaToken(token); setError('') }}
                    onExpire={() => { setCaptchaToken(''); setError('The security check expired. Complete it again, then tap Claim my profile.') }}
                    onError={() => {
                      setCaptchaToken('')
                      setError('The security check could not load. Check your connection and try again.')
                    }}
                  />
                  <p role="status" className="mt-3 text-sm text-slate-700">
                    {captchaToken
                      ? 'Security check complete. Tap Claim my profile below to create your account.'
                      : 'Complete the security check, then tap Claim my profile below.'}
                  </p>
                  {captchaUnavailable ? (
                    <p role="alert" className="text-sm text-red-700">
                      The security check is temporarily unavailable. Please try again shortly.
                    </p>
                  ) : null}
                </div>

                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                <div ref={claimActions} className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setCaptchaToken('')
                      setCaptchaKey((key) => key + 1)
                      setStep(2)
                    }}
                    disabled={submitting}
                    className="min-h-11 rounded-xl text-slate-600"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="min-h-11 rounded-xl bg-[#ef7b29] px-6 font-semibold text-[#25180f] hover:bg-[#f59a46]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating your account…
                      </>
                    ) : (
                      <>
                        Claim my profile
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
        </div>
        </div>
      </div>
    </main>
  )
}
