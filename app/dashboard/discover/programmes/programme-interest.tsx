'use client'

import { useState } from 'react'
import { changeProgrammeInterest, useProgrammeInterest, type Interest } from './programme-interest-client'

const section = 'scroll-mt-24 space-y-4 rounded-2xl border bg-white p-5 sm:p-6'
const action = 'inline-flex min-h-11 items-center rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-neutral-950 disabled:opacity-50'

export function ProgrammeInterest() {
  const { activities = [], interests, load, retry, remember, forget } = useProgrammeInterest()
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const previous = interests.filter(item =>
    item.kind !== 'community' && !activities.some(activity => activity.id === item.activity_id)
  )

  async function change(activityId: string | null, existing?: Interest) {
    if (pending) return
    if (!existing && !consent) {
      setNotice({ text: 'Agree to follow-up before you register.', error: true })
      return
    }
    setPending(true)
    setNotice(null)
    try {
      const response = await changeProgrammeInterest(existing ? 'DELETE' : 'POST', existing
        ? { id: existing.id }
        : { kind: 'programme', activity_id: activityId, consent })
      if (!response.ok) throw new Error(response.message || response.error || 'Your request could not be saved.')
      if (existing) {
        forget(existing.id)
        setNotice({ text: 'Interest withdrawn.', error: false })
      } else if (response.interest) {
        remember(response.interest)
        setNotice({ text: 'Interest recorded. Top100 may contact you about this programme.', error: false })
      }
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Your request could not be saved.', error: true })
    } finally {
      setPending(false)
    }
  }

  return <div className="space-y-6">
    <section id="open-programmes" className={section}>
      <h2 className="text-xl font-semibold">Open for interest</h2>
      {load === 'loading' && <p role="status" className="text-sm">Loading available programmes…</p>}
      {load === 'error' && <div className="space-y-2">
        <p role="alert" className="text-sm text-neutral-700">Programme signups are temporarily unavailable.</p>
        <button type="button" className={action} onClick={retry}>Try again</button>
      </div>}
      {load === 'ready' && (activities.length === 0
        ? <p className="text-sm text-neutral-600">No additional programmes are open for interest right now.</p>
        : <>
          <label className="flex min-h-11 items-start gap-2 text-sm">
            <input className="mt-1" type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />
            I agree to be contacted about the programmes I select.
          </label>
          <ul className="divide-y">{activities.map(activity => {
            const existing = interests.find(item => item.activity_id === activity.id)
            return <li key={activity.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <p className="font-medium">{activity.title}</p>
              <button className={action} disabled={pending} type="button" onClick={() => void change(activity.id, existing)}>
                {existing ? 'Withdraw interest' : 'Register interest'}
              </button>
            </li>
          })}</ul>
        </>)}
      {notice && <p role={notice.error ? 'alert' : 'status'} className="text-sm">{notice.text}</p>}
    </section>

    {load === 'ready' && previous.length > 0 && <section className={section}>
      <h2 className="text-xl font-semibold">Your previous interests</h2>
      <ul className="divide-y">{previous.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <span>{item.kind === 'mentor' ? 'Mentoring' : item.kind === 'volunteer' ? 'Volunteering' : 'Interest in a programme that has closed'}</span>
        <button type="button" disabled={pending} className="min-h-11 text-sm underline" onClick={() => void change(item.activity_id, item)}>Withdraw interest</button>
      </li>)}</ul>
    </section>}
  </div>
}
