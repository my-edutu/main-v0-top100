'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { communityCategories, communityRoles, type CommunityDetails } from '@/lib/programme-manager/interest'

import { useDashboardMember } from '../../_providers/dashboard-member'

type Country = { name: string; code: string }
type Interest = { id: string; kind: string; activity_id: string | null }
type Activity = { id: string; title: string; month: number; format: string }

const section = 'scroll-mt-24 space-y-4 rounded-2xl border bg-white p-5 sm:p-6'
const field = 'mt-1 w-full rounded-lg border border-neutral-300 bg-white p-3 text-sm'
const action = 'inline-flex min-h-11 items-center rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50'
const steps = ['Your details', 'Roles and causes', 'Availability and consent']
const group = 'space-y-3 border-t border-neutral-200 pt-4'

function toggle<T>(items: T[], value: T) {
  return items.includes(value) ? items.filter(item => item !== value) : [...items, value]
}

export function ProgrammeInterest({ communityOnly = false, countries = [] }: {
  communityOnly?: boolean
  countries?: Country[]
} = {}) {
  const { member } = useDashboardMember()
  const [step, setStep] = useState(0)
  const stepTitle = useRef<HTMLParagraphElement>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [draft, setDraft] = useState<CommunityDetails>(() => ({
    full_name: member.name, email: member.email, country_code: '', location: '',
    roles: [], categories: [], availability: 'flexible', contribution: '',
  }))
  const [consent, setConsent] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/member/programme-interest', { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.message)
        setActivities(body.activities)
        setInterests(body.interests)
        setLoaded(true)
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError('Signups could not load. Refresh to try again.')
      })
    return () => controller.abort()
  }, [])

  const communityInterest = interests.find(item => item.kind === 'community')
  const otherInterests = interests.filter(item =>
    item.kind !== 'community' && !activities.some(activity => activity.id === item.activity_id)
  )

  async function change(kind: 'community' | 'programme', activityId: string | null, existing?: Interest) {
    if (pending || !loaded) return
    if (!existing && !consent) {
      setNotice({ text: 'Agree to follow-up before you submit.', error: true })
      return
    }
    setPending(true)
    setNotice(null)
    try {
      const response = await fetch('/api/member/programme-interest', {
        method: existing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existing ? { id: existing.id } : {
          kind, activity_id: activityId, consent,
          ...(kind === 'community' ? {
            community_details: {
              ...draft,
              location: `${draft.location.trim()}, ${countries.find(country => country.code === draft.country_code)?.name}`,
            },
          } : {}),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.message || 'Your interest could not be saved.')
      if (existing) {
        setInterests(items => items.filter(item => item.id !== existing.id))
        if (kind === 'community') {
          setStep(0)
          setConsent(false)
        }
        setNotice({ text: 'Interest withdrawn.', error: false })
      } else {
        setInterests(items => [...items, body.interest])
        setNotice({ text: 'Interest recorded. Top100 may contact you about a suitable activity.', error: false })
      }
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Your interest could not be saved.', error: true })
    } finally {
      setPending(false)
    }
  }

  function moveStep(next: number) {
    setNotice(null)
    setStep(next)
    stepTitle.current?.focus()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 0 && (draft.full_name.trim().length < 2 || draft.location.trim().length < 2)) {
      setNotice({ text: 'Enter your full name and city.', error: true })
      return
    }
    if (step === 1 && (!draft.roles.length || !draft.categories.length)) {
      setNotice({ text: 'Choose at least one role and one impact category.', error: true })
      return
    }
    if (step < steps.length - 1) {
      moveStep(step + 1)
      return
    }
    void change('community', null)
  }

  return <div className="space-y-6">
    {communityOnly && <section id="community-impact-network" aria-labelledby="community-impact-network-title" className="scroll-mt-24 space-y-5">
      <div>
        <h1 id="community-impact-network-title" className="text-2xl font-semibold">Join the Community Impact Network</h1>
        <p className="mt-1 text-sm text-neutral-600">Tell us how you’d like to help and how we can reach you.</p>
      </div>
      {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}
      {!loaded && !loadError && <p role="status" className="text-sm">Checking your signup…</p>}
      {communityInterest ? <div className="space-y-2">
        <p className="text-sm">Your community interest is recorded.</p>
        <button type="button" disabled={pending} className="min-h-11 text-sm underline" onClick={() => void change('community', null, communityInterest)}>Withdraw community interest</button>
      </div> : <form id="community-signup" onSubmit={submit} className="space-y-4">
        <p ref={stepTitle} tabIndex={-1} className="text-sm font-semibold text-neutral-700">
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>
        {step === 0 && <fieldset disabled={pending} className={group}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Full name<input className={field} name="fullName" autoComplete="name" required minLength={2} maxLength={150} value={draft.full_name} onChange={event => setDraft({ ...draft, full_name: event.target.value })} /></label>
            <label className="text-sm font-medium">Email address<input className={field} name="email" type="email" autoComplete="email" required maxLength={254} value={draft.email} onChange={event => setDraft({ ...draft, email: event.target.value })} /></label>
            <label className="text-sm font-medium">Country<select className={field} name="country" autoComplete="country" required value={draft.country_code} onChange={event => setDraft({ ...draft, country_code: event.target.value })}>
              <option value="">Select your country</option>
              {countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select></label>
            <label className="text-sm font-medium">City<input className={field} name="city" autoComplete="address-level2" required minLength={2} maxLength={100} value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} /></label>
          </div>
        </fieldset>}
        {step === 1 && <fieldset disabled={pending} className={group}>
          <fieldset>
            <legend className="font-medium">Roles you’d like to take</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(communityRoles).map(([key, label]) => {
                const role = key as keyof typeof communityRoles
                return <label key={role} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input type="checkbox" checked={draft.roles.includes(role)} onChange={() => setDraft(current => ({ ...current, roles: toggle(current.roles, role) }))} />{label}
                </label>
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-medium">Impact categories</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {Object.entries(communityCategories).map(([key, label]) => {
                const category = key as keyof typeof communityCategories
                return <label key={category} className="flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                  <input type="checkbox" checked={draft.categories.includes(category)} onChange={() => setDraft(current => ({ ...current, categories: toggle(current.categories, category) }))} />{label}
                </label>
              })}
            </div>
          </fieldset>
        </fieldset>}
        {step === 2 && <fieldset disabled={pending} className={group}>
          <label className="block text-sm font-medium">Availability<select className={field} name="availability" value={draft.availability} onChange={event => setDraft({ ...draft, availability: event.target.value as CommunityDetails['availability'] })}><option value="flexible">Flexible</option><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option></select></label>
          <label className="block text-sm font-medium">How would you like to help?<textarea className={field} name="contribution" required minLength={5} maxLength={500} rows={3} value={draft.contribution} onChange={event => setDraft({ ...draft, contribution: event.target.value })} /></label>
          <label className="flex min-h-11 items-start gap-2 text-sm"><input className="mt-1" type="checkbox" required checked={consent} onChange={event => setConsent(event.target.checked)} />I agree that Top100 may contact me about the roles and programmes I select.</label>
        </fieldset>}
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 && <button type="button" className="min-h-11 px-3 text-sm underline" disabled={pending} onClick={() => moveStep(step - 1)}>Back</button>}
          <button className={action} disabled={pending || (step === 2 && !loaded)}>
            {step < 2 ? 'Continue' : pending ? 'Saving…' : 'Register community interest'}
          </button>
        </div>
      </form>}
      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'text-sm text-red-700' : 'text-sm text-green-800'}>{notice.text}</p>}
    </section>}

    {!communityOnly && <>
    <section id="open-programmes" className={section}>
      <h2 className="text-xl font-semibold">Open for interest</h2>
      {!loaded ? <p className="text-sm">{loadError || 'Loading available programmes…'}</p> : !activities.length ? <p className="text-sm text-neutral-600">Top100 hasn’t opened any programme signups yet.</p> : <>
        <label className="flex min-h-11 items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />I agree to be contacted about the programmes I select.</label>
        <ul className="divide-y">{activities.map(activity => {
          const existing = interests.find(item => item.activity_id === activity.id)
          return <li key={activity.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="font-medium">{activity.title}</p>
            <button className={action} disabled={pending} type="button" onClick={() => void change('programme', activity.id, existing)}>{existing ? 'Withdraw interest' : 'Register interest'}</button>
          </li>
        })}</ul>
        {notice && <p role={notice.error ? 'alert' : 'status'} className="text-sm">{notice.text}</p>}
      </>}
    </section>

    {loaded && otherInterests.length > 0 && <section className={section}>
      <h2 className="text-xl font-semibold">Your previous interests</h2>
      <ul className="divide-y">{otherInterests.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <span>{item.kind === 'mentor' ? 'Mentoring' : item.kind === 'volunteer' ? 'Volunteering' : 'Interest in a programme that has closed'}</span>
        <button type="button" disabled={pending} className="min-h-11 text-sm underline" onClick={() => void change('programme', item.activity_id, item)}>Withdraw interest</button>
      </li>)}</ul>
      {notice && <p role="status" className="text-sm">{notice.text}</p>}
    </section>}
    </>}
  </div>
}
