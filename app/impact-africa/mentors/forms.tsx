'use client'

import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { TurnstileCaptcha } from '@/components/ui/turnstile'
import type { MentorFormState, MentorProfile } from '@/lib/mentors/server'
import { MENTOR_PORTAL } from '@/lib/mentors/contracts'
import { fieldClass, primary } from '@/lib/mentors/ui'
import { saveMentorProfile, updateMentorWorkspace } from './actions'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-stone-900">{label}{children}</label>
}

export function MentorAuthForm() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [captcha, setCaptcha] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/impact-africa/mentors/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stage === 'email' ? { action: 'send', email, captchaToken: captcha } : { action: 'verify', email, code }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Please try again.')
      if (stage === 'email') setStage('code')
      else window.location.assign(MENTOR_PORTAL)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.')
    } finally {
      if (stage === 'email') {
        setCaptcha('')
        setCaptchaKey(key => key + 1)
      }
      setPending(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      {stage === 'email' ? <>
        <Field label="Email address">
          <input className={fieldClass} type="email" autoComplete="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} />
        </Field>
        {captchaRequired && <TurnstileCaptcha key={captchaKey} action="signup" onVerify={setCaptcha} onExpire={() => setCaptcha('')} onError={() => setCaptcha('')} />}
      </> : <>
        <p className="break-words text-sm leading-6 text-stone-600">Check <strong>{email}</strong> for your code.</p>
        <Field label="Sign-in code">
          <input className={fieldClass} name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required value={code} onChange={event => setCode(event.target.value)} />
        </Field>
      </>}
      {error && <p role="alert" className="text-sm font-medium text-red-800">{error}</p>}
      <button type="submit" className={`${primary} w-full`} disabled={pending || (stage === 'email' && captchaRequired && !captcha)}>
        {pending ? 'Please wait…' : stage === 'email' ? 'Email me a code' : 'Sign in'}
      </button>
      {stage === 'code' && <button type="button" className="min-h-11 text-sm font-semibold underline underline-offset-4" disabled={pending} onClick={() => {
        setStage('email')
        setCode('')
        setError('')
      }}>Change email or send a new code</button>}
      <p className="text-sm text-stone-600">Already use a Top100 password? <Link href={`/login?from=${MENTOR_PORTAL}`} className="font-semibold text-stone-900 underline underline-offset-4">Sign in to Top100</Link>.</p>
    </form>
  )
}

export function MentorActionForm({ action, children, className, localTime = false }: {
  action: (state: MentorFormState, form: FormData) => Promise<MentorFormState>
  children: ReactNode
  className?: string
  localTime?: boolean
}) {
  const [state, dispatch, pending] = useActionState(action, {})
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const data = new FormData(event.currentTarget, submitter)
    if (localTime) {
      const time = new Date(String(data.get('startsAt')))
      if (Number.isFinite(time.getTime())) data.set('startsAt', time.toISOString())
    }
    startTransition(() => dispatch(data))
  }
  return (
    <form onSubmit={submit} className={className}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">{children}</fieldset>
      {pending && <p role="status" className="mt-2 text-sm text-stone-600">Saving…</p>}
      {state.error && <p role="alert" className="mt-2 text-sm font-medium text-red-800">{state.error}</p>}
      {state.success && <p role="status" className="mt-2 text-sm font-medium text-green-800">{state.success}</p>}
    </form>
  )
}

export function ProfileForm({ profile, matchingOpen }: { profile: MentorProfile | null; matchingOpen: boolean }) {
  return (
    <MentorActionForm action={saveMentorProfile}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><input className={fieldClass} name="name" autoComplete="name" required minLength={2} maxLength={100} defaultValue={profile?.name} /></Field>
        <Field label="Your role or headline"><input className={fieldClass} name="headline" required minLength={2} maxLength={120} placeholder="e.g. Product designer" defaultValue={profile?.headline} /></Field>
      </div>
      <Field label="What can you help with?"><input className={fieldClass} name="expertise" required minLength={2} maxLength={240} placeholder="e.g. Career changes, design portfolios" defaultValue={profile?.expertise} /></Field>
      <Field label="About you"><textarea className={fieldClass} name="bio" required minLength={10} maxLength={1200} rows={4} placeholder="Share your experience and what you can help a member learn." defaultValue={profile?.bio} /></Field>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-stone-900">
        <input type="checkbox" name="acceptingRequests" className="size-5 accent-orange-600" defaultChecked={profile?.accepting_requests} />
        Show my profile to members and let them request a match {matchingOpen ? '' : 'when matching opens'}
      </label>
      <button className={primary} type="submit">Save mentor profile</button>
    </MentorActionForm>
  )
}

export function AddSlotForm() {
  return (
    <MentorActionForm action={updateMentorWorkspace} localTime>
      <input type="hidden" name="intent" value="add-slot" />
      <Field label="Start time (your device’s time zone)"><input className={fieldClass} type="datetime-local" name="startsAt" required /></Field>
      <Field label="Private video meeting link"><input className={fieldClass} type="url" name="meetingUrl" required maxLength={500} placeholder="https://…" /></Field>
      <button className={primary} type="submit">Add 30-minute time</button>
    </MentorActionForm>
  )
}
