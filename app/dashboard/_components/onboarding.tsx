'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LoaderCircle } from 'lucide-react'
import type { MemberProfile } from '@/lib/member-hub'
import { MAX_INTERESTS, MIN_INTERESTS, onboardingFields } from '@/lib/dashboard/onboarding'
import { SignOutControl } from '../dashboard-header'
import { getCountries } from 'libphonenumber-js/min'
import { OnboardingWelcome } from './onboarding-welcome'

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countryNames = getCountries().map(code => regionNames.of(code) || code).sort()
const interestSuggestions = [
  'Technology',
  'Education',
  'Climate Action',
  'Public Health',
  'Entrepreneurship',
  'Creative Economy',
  'Policy & Governance',
  'Social Impact',
]

export function Onboarding({
  member,
  onComplete,
}: {
  member: MemberProfile
  onComplete: (member: MemberProfile) => void
}) {
  const [step, setStep] = useState(Math.min(member.onboardingStep ?? 0, 4))
  const [welcomeOpen, setWelcomeOpen] = useState((member.onboardingStep ?? 0) === 0)
  const [values, setValues] = useState({
    headline: member.headline,
    location: member.location,
    field: member.field,
    bio: member.bio,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [interestInput, setInterestInput] = useState('')
  const interests = values.field.split(',').map(value => value.trim()).filter(Boolean)
  function addInterest(value = interestInput) {
    const tag = value.trim().replace(/,/g, ' ')
    if (!tag) return
    if (tag.length > 28) { setError('Keep each interest to 28 characters.'); return }
    if (interests.some(value => value.toLowerCase() === tag.toLowerCase())) { setError('That interest is already added.'); return }
    if (interests.length >= MAX_INTERESTS) { setError(`You can add up to ${MAX_INTERESTS} interests. Remove one to change it.`); return }
    setValues({ ...values, field: [...interests, tag].join(', ') })
    setInterestInput('')
    setError('')
  }
  const field = onboardingFields[step]
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    if (field) {
      if (field.key === 'field' && interests.length < MIN_INTERESTS) { setError('Add at least one interest before continuing.'); return }
      if (field.key === 'field' && interests.length > MAX_INTERESTS) { setError(`You can add up to ${MAX_INTERESTS} interests.`); return }
      const answer = values[field.key].trim()
      if (answer.length < field.min || answer.length > field.max) {
        setError(`Please enter ${field.min}–${field.max} characters.`)
        return
      }
      setStep(step + 1)
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/member/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          step: 4,
          complete: true,
        }),
      })
      const data = await response.json()
      if (!response.ok)
        throw new Error(data.message || 'Could not save your progress.')
      onComplete(data.member)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Please try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="min-h-dvh bg-white px-5 py-6 text-neutral-950 sm:px-10">
      <OnboardingWelcome name={member.name} open={welcomeOpen} onOpenChange={setWelcomeOpen} />
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <img
          src="/Top100 Africa Future leaders Logo .png"
          alt="Top100 Africa Future Leaders"
          className="h-12 w-28 object-contain"
        />
        <SignOutControl menu />
      </header>
      <main className="mx-auto max-w-lg pb-12 pt-10 sm:pt-16">
        <p className="mb-3 text-sm text-orange-700">
          Your awardee profile · {step + 1} of 5
        </p>
        <div className="mb-10 flex gap-2" aria-label={`Step ${step + 1} of 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <span
              key={index}
              className="h-1 flex-1 rounded-full"
              style={{
                background:
                  index <= step
                    ? 'linear-gradient(90deg,#f97316,#f59e0b)'
                    : '#e5e5e5',
              }}
            />
          ))}
        </div>
        <form onSubmit={save}>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            {field?.title ?? 'Ready to meet your community?'}
          </h1>
          <p className="mb-8 mt-3 text-base leading-7 text-neutral-600">
            {field?.hint ??
              'Check your introduction before opening your dashboard. You can update your profile later.'}
          </p>
          {field ? (
            <div>
              <label className="sr-only" htmlFor="onboarding-field">
                {field.title}
              </label>
              {field.key === 'location' ? (
                <select id="onboarding-field" required autoFocus autoComplete="country-name" value={countryNames.find(name => name.toLowerCase() === values.location.toLowerCase()) || ''} onChange={event => setValues({ ...values, location:event.target.value })} className="h-14 w-full rounded-xl border border-neutral-300 bg-white px-4 text-base focus:outline-orange-600">
                  <option value="">Select your country</option>
                  {countryNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              ) : field.key === 'field' ? (
                <div>
                  <div className="mb-3 flex flex-wrap gap-1.5" aria-label="Selected interests">
                    {interests.map(tag => <button key={tag} type="button" aria-label={`Remove ${tag}`} onClick={() => setValues({ ...values, field:interests.filter(value => value !== tag).join(', ') })} className="min-h-8 rounded-full border border-orange-300 bg-orange-50 px-2.5 text-xs leading-5">{tag} <span aria-hidden="true" className="ml-1">×</span></button>)}
                  </div>
                  <div className="flex gap-2">
                    <input id="onboarding-field" value={interestInput} disabled={interests.length >= MAX_INTERESTS} onChange={event => setInterestInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addInterest() } }} placeholder="e.g. Technology" maxLength={28} className="h-14 min-w-0 flex-1 rounded-xl border border-neutral-300 px-4 text-base" />
                    <button type="button" disabled={!interestInput.trim() || interests.length >= MAX_INTERESTS} onClick={() => addInterest()} className="min-h-11 rounded-xl border border-orange-300 px-4 disabled:opacity-40">Add</button>
                  </div>
                  <div className="mt-4" aria-label="Suggested interests">
                    <p className="mb-2 text-xs font-medium text-neutral-500">Suggested interests</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {interestSuggestions.filter(suggestion => !interests.some(value => value.toLowerCase() === suggestion.toLowerCase())).map(suggestion => (
                        <button
                          key={suggestion}
                          type="button"
                          disabled={interests.length >= MAX_INTERESTS}
                          onClick={() => addInterest(suggestion)}
                          className="min-h-10 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-neutral-500" aria-live="polite">{interests.length} interest{interests.length === 1 ? '' : 's'} · Up to {MAX_INTERESTS} allowed · Tap a tag to remove it.</p>
                </div>
              ) : field.key === 'bio' ? (
                <textarea
                  key={field.key}
                  id="onboarding-field"
                  autoFocus
                  required
                  minLength={field.min}
                  maxLength={field.max}
                  rows={7}
                  value={values[field.key]}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-2xl border border-neutral-300 p-4 text-base focus:outline-orange-600"
                />
              ) : (
                <input
                  key={field.key}
                  id="onboarding-field"
                  autoFocus
                  required
                  minLength={field.min}
                  maxLength={field.max}
                  value={values[field.key]}
                  onChange={(e) =>
                    setValues({ ...values, [field.key]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  className="h-14 w-full rounded-xl border border-neutral-300 px-4 text-base focus:outline-orange-600"
                />
              )}
              <p className="mt-3 text-xs text-neutral-500">
                {field.key === 'bio'
                  ? `${values.bio.length} / ${field.max} characters · at least ${field.min}`
                  : 'Your answers will be saved together when you complete setup.'}
              </p>
            </div>
          ) : (
            <dl className="divide-y divide-neutral-200">
              {onboardingFields.map((item) => (
                <div key={item.key} className="py-4">
                  <dt className="mb-1 text-xs capitalize text-neutral-500">
                    {item.key}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words text-base leading-6">
                    {item.key === 'field' ? <span className="flex flex-wrap gap-2">{interests.map(tag => <span key={tag} className="rounded-full border border-orange-200 px-3 py-1 text-sm">{tag}</span>)}</span> : values[item.key]}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
          {field?.key === 'bio' && <button type="button" onClick={() => { setValues({ ...values, bio: '' }); setError(''); setStep(4) }} className="mt-4 min-h-11 text-sm text-neutral-600 underline underline-offset-4">Skip for now — add your story later</button>}
          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => { setError(''); setStep(step - 1) }}
                className="flex h-12 items-center gap-2 rounded-xl border px-4"
              >
                <ArrowLeft size={18} /> Back
              </button>
            )}
            <button
              disabled={busy}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl px-5 font-medium text-black disabled:opacity-60"
              style={{
                background:
                  'linear-gradient(90deg,#f97316,#fb923c 52%,#f59e0b)',
              }}
            >
              {busy ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : step === 4 ? (
                <Check size={18} />
              ) : (
                <ArrowRight size={18} />
              )}
              {busy ? 'Saving your profile...' : step === 4 ? 'Complete setup' : 'Continue'}
            </button>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-neutral-500">
            Complete these steps to access your awardee dashboard.
            <br />
            Keep this page open until you complete setup to retain your answers.
          </p>
        </form>
      </main>
    </div>
  )
}
