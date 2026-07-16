'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
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

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import LegalConsent from '@/app/components/LegalConsent'

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
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [error, setError] = useState('')

  // Step 1 — directory
  const [directory, setDirectory] = useState<DirectoryAwardee[]>([])
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryError, setDirectoryError] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<DirectoryAwardee | null>(null)

  // Step 2 — verification
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  // Step 3 — credentials
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadDirectory() {
      try {
        const res = await fetch('/api/auth/claim-directory')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Could not load the awardee directory.')
        if (!cancelled) setDirectory(data.awardees ?? [])
      } catch (err) {
        if (!cancelled) {
          setDirectoryError(err instanceof Error ? err.message : 'Could not load the awardee directory.')
        }
      } finally {
        if (!cancelled) setDirectoryLoading(false)
      }
    }
    loadDirectory()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return directory
    return directory.filter((a) =>
      [a.name, a.country ?? '', a.course ?? ''].some((field) => field.toLowerCase().includes(q))
    )
  }, [directory, query])

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
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!selected) {
      setStep(1)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awardeeId: selected.id,
          email: email.trim(),
          password,
          inviteCode: inviteCode.trim(),
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.message || 'Could not create this account.')
        // Verification problems are fixed on step 2, not here.
        if (response.status === 403 || response.status === 404 || response.status === 409) {
          setStep(2)
        }
        setSubmitting(false)
        return
      }

      // Auto sign-in so they land in the hub with a real session.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
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
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_28%),linear-gradient(180deg,#fffaf4_0%,#ffffff_48%,#f8f1e7_100%)] px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <Badge variant="soft" className="border-orange-200 bg-white/80 text-orange-700">
            Invite only
          </Badge>
          <Link
            href="/login"
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </div>

        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Claim your awardee profile.
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Your profile already exists in the Top100 directory. Find yourself, verify it&apos;s really
          you with the code from the admin team, and take control of it.
        </p>

        {/* Stepper */}
        <ol className="mt-8 flex items-center gap-2">
          {STEPS.map((s, index) => {
            const state = step === s.id ? 'current' : step > s.id ? 'done' : 'todo'
            return (
              <li key={s.id} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                    state === 'done' && 'border-orange-500 bg-orange-500 text-white',
                    state === 'current' && 'border-orange-500 bg-orange-50 text-orange-700',
                    state === 'todo' && 'border-slate-200 bg-white text-slate-400'
                  )}
                >
                  {state === 'done' ? <BadgeCheck className="h-4 w-4" /> : s.id}
                </span>
                <span
                  className={cn(
                    'hidden text-xs font-semibold sm:block',
                    state === 'todo' ? 'text-slate-400' : 'text-slate-800'
                  )}
                >
                  {s.title}
                </span>
                {index < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
              </li>
            )
          })}
        </ol>

        <Card className="mt-6 border-orange-100 bg-white/95 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.55)]">
          <CardContent className="p-6 sm:p-8">
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
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Who are you?</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Choose your name from the list of awardees who haven&apos;t claimed their profile yet.
                  </p>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search your name, country, or field…"
                    className="rounded-2xl pl-10"
                    autoFocus
                  />
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1" role="listbox" aria-label="Awardee directory">
                  {directoryLoading && (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading the directory…
                    </div>
                  )}
                  {!directoryLoading && directoryError && (
                    <p className="py-8 text-center text-sm font-medium text-red-600">{directoryError}</p>
                  )}
                  {!directoryLoading && !directoryError && filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-500">
                      No unclaimed profile matches “{query}”. Already claimed yours?{' '}
                      <Link href="/login" className="font-semibold text-orange-700">
                        Sign in
                      </Link>{' '}
                      — or contact the admin team.
                    </p>
                  )}
                  {!directoryLoading &&
                    filtered.map((awardee) => (
                      <button
                        key={awardee.id}
                        type="button"
                        role="option"
                        aria-selected={selected?.id === awardee.id}
                        onClick={() => choose(awardee)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left transition-colors hover:border-orange-200 hover:bg-orange-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40"
                      >
                        {awardee.imageUrl ? (
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
                          <span className="block truncate text-sm font-semibold text-slate-900">{awardee.name}</span>
                          <span className="block truncate text-xs text-slate-500">
                            {[awardee.country, awardee.course].filter(Boolean).join(' · ') || 'Top100 awardee'}
                          </span>
                        </span>
                        <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* STEP 2 — verify email + admin-issued code */}
            {step === 2 && selected && (
              <form onSubmit={handleVerifyStep} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Verify it&apos;s you</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Confirm the email on record and enter the one-time code issued by the admin team.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                    {initials(selected.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{selected.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[selected.country, selected.course].filter(Boolean).join(' · ') || 'Top100 awardee'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="ml-auto shrink-0 text-xs font-semibold text-orange-700 underline-offset-4 hover:underline"
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
                      className="rounded-2xl pl-10"
                    />
                  </div>
                  {selected.emailHint && (
                    <p className="text-xs text-slate-500">
                      Hint: the email on record looks like <span className="font-semibold">{selected.emailHint}</span>.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-code">One-time code</Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="signup-code"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder="AFL-XXXXX-XXXXX"
                      className="rounded-2xl pl-10 uppercase tracking-wider"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Issued by the Top100 admin team. No code yet? Reach out to your program contact.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setStep(1)} className="rounded-full text-slate-600">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-white hover:opacity-95">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* STEP 3 — set a password */}
            {step === 3 && selected && (
              <form onSubmit={handleCreateAccount} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Secure your account</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Set a password for <span className="font-semibold text-slate-800">{email}</span>. From here on,
                    you control your profile.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="rounded-2xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm password</Label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className="rounded-2xl"
                  />
                </div>

                <LegalConsent id="signup-legal-consent" />

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(2)}
                    disabled={submitting}
                    className="rounded-full text-slate-600"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-white hover:opacity-95"
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
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
