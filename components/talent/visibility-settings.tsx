'use client'
import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, EyeOff } from 'lucide-react'
import { TALENT_POLICY_VERSION } from '@/lib/talent/contracts'
import { talentVisibilityStatus } from '@/lib/talent/visibility'
import type { TalentRecord, TalentVisibilityInput } from '@/lib/talent/types'
import { useTalentMember, type TalentMemberState } from './use-talent'
import { useUnsavedChanges } from './use-unsaved-changes'
import { primaryClass, secondaryClass, TalentNotice } from './ui'

function choicesFor(profile: TalentRecord): TalentVisibilityInput {
  return { discoveryEnabled: profile.discovery_enabled, introductionsEnabled: profile.introductions_enabled, promotionEnabled: profile.promotion_enabled, outreachEmailOptOut: profile.outreach_email_opt_out, policyVersion: TALENT_POLICY_VERSION }
}
const options = [
  { key: 'discoveryEnabled', title: 'Let employers find my work profile', description: 'Show your approved work profile in Talent Discovery and allow search engines to find it. Your account email stays private unless you agree to share it.' },
  { key: 'introductionsEnabled', title: 'Send me introduction requests', description: 'Top100 can tell you about a job or project that fits. You decide whether to accept each request.' },
  { key: 'promotionEnabled', title: 'Let Top100 feature my work', description: 'Top100 may include your approved public work in a story or collection.' },
  { key: 'outreachEmailOptOut', title: 'Stop talent update emails', description: 'You’ll still get account and security emails.' },
] as const

export function TalentVisibilitySettings() {
  const member = useTalentMember()
  return <TalentVisibilityControls resource={member} />
}

/** The editor passes its own member state so privacy and draft saves never have
 * independent stale copies of the same record. Unsaved choices are not server state. */
export function TalentVisibilityPanel({ member, embedded = false, onDirtyChange }: { member: TalentMemberState; embedded?: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  return <TalentVisibilityControls resource={member} embedded={embedded} onDirtyChange={onDirtyChange} />
}
export function TalentVisibilityControls({ resource, embedded = false, onDirtyChange }: { resource: TalentMemberState; embedded?: boolean; onDirtyChange?: (dirty: boolean) => void }) {
  const { data, loading, disabled, error, reload, mutate, saving: serverSaving } = resource
  const [choices, setChoices] = useState<TalentVisibilityInput | null>(null)
  const [baseRevision, setBaseRevision] = useState<number | null>(null)
  const [owner, setOwner] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saveError, setSaveError] = useState('')
  const [conflict, setConflict] = useState(false)
  const inFlight = useRef(false)
  const active = useRef(true)
  const currentOwner = useRef(data?.talent.profile_id)
  currentOwner.current = data?.talent.profile_id
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    if (data && (choices === null || owner !== data.talent.profile_id)) {
      setChoices(choicesFor(data.talent)); setBaseRevision(data.talent.visibility_revision); setOwner(data.talent.profile_id); setConflict(false); setFeedback(''); setSaveError('')
    }
  }, [data, choices, owner])
  const dirty = Boolean(data && choices && JSON.stringify(choices) !== JSON.stringify(choicesFor(data.talent)))
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false) }, [dirty, onDirtyChange])
  useUnsavedChanges(!embedded && dirty)
  if (disabled) return null
  if (!data || !choices) {
    if (loading || (data && !choices)) return <p role="status" className="p-5 text-sm text-stone-600">Loading talent visibility choices…</p>
    return <div className="space-y-3"><TalentNotice error>{error || 'Could not load privacy choices.'}</TalentNotice><button type="button" className={secondaryClass} onClick={() => void reload()}>Try again</button></div>
  }
  async function reviewLatest() {
    if (inFlight.current || serverSaving) return
    const requestOwner = currentOwner.current
    inFlight.current = true; setSaving(true); setSaveError('')
    try {
      const latest = await reload()
      if (!active.current || currentOwner.current !== requestOwner) return
      if (!latest) { setSaveError('Could not refresh saved choices. Nothing has been changed.'); return }
      setChoices(choicesFor(latest.talent)); setBaseRevision(latest.talent.visibility_revision); setConflict(false)
      setFeedback('Latest saved choices loaded. Review them before making another change.')
    } finally { inFlight.current = false; if (active.current) setSaving(false) }
  }
  async function save(withdraw = false) {
    if (!data || !choices || baseRevision === null || inFlight.current || serverSaving || (conflict && !withdraw)) return
    const requestOwner = currentOwner.current
    inFlight.current = true; setSaving(true); setFeedback(''); setSaveError('')
    try {
      const body = withdraw ? { action: 'withdraw' } : { action: 'visibility', expectedVisibilityRevision: baseRevision, visibility: choices }
      const result = { talent: await mutate(body) }
      if (!active.current || currentOwner.current !== requestOwner) return
      setChoices(choicesFor(result.talent)); setBaseRevision(result.talent.visibility_revision); setConflict(false)
      setFeedback(withdraw ? 'Discovery, new introductions and promotion are off. Earlier introductions cannot be reopened by turning discovery back on. Your awardee account is unchanged.' : 'Your privacy choices are saved.')
    } catch (e) {
      if (!active.current || currentOwner.current !== requestOwner) return
      const isConflict = (e as { status?: number }).status === 409
      if (isConflict) setConflict(true)
      setSaveError(isConflict ? 'Your privacy choices changed in another tab. This page has not overwritten them. Load the latest choices, or turn everything off now.' : e instanceof Error ? e.message : 'Your choices were not saved.')
    } finally { inFlight.current = false; if (active.current) setSaving(false) }
  }
  return <section aria-labelledby="talent-privacy-title" id="talent-privacy" className="rounded-[24px] border border-stone-200 bg-white p-5 sm:p-7">
    <div className="mb-4 flex gap-3"><ShieldCheck className="mt-1 size-6 shrink-0 text-orange-700" aria-hidden="true" /><div><h2 id="talent-privacy-title" className="text-xl font-semibold text-stone-900">Talent discovery & privacy</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Choose how employers and Top100 can use your work profile. These settings do not change your awardee page.</p></div></div>
    <div className="mb-3 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-700"><strong>Visibility now: </strong>{talentVisibilityStatus(data.talent)}</div>
    <fieldset disabled={saving || serverSaving || conflict} className="min-w-0 divide-y divide-stone-100"><legend className="sr-only">Choose how your talent profile may be used</legend>{options.map(option => <label key={option.key} className="flex cursor-pointer items-start gap-3 py-4"><input id={`talent-consent-${option.key}`} aria-describedby={`talent-consent-${option.key}-hint`} type="checkbox" checked={choices[option.key]} onChange={event => { setFeedback(''); setChoices({ ...choices, [option.key]: event.target.checked }) }} className="mt-1 size-5 shrink-0 accent-orange-700 focus-visible:outline-orange-700" /><span><span className="block text-sm font-semibold text-stone-900">{option.title}</span><span id={`talent-consent-${option.key}-hint`} className="mt-1 block text-sm leading-6 text-stone-600">{option.description}</span></span></label>)}</fieldset>
    <p className="my-4 text-xs leading-5 text-stone-600">Turning discovery off hides your work profile and closes active introductions, even ones marked complete. People may still have copies of details you already shared.</p>
    {dirty && !conflict && <p role="status" className="mb-3 text-sm font-medium text-orange-900">You have unsaved privacy choices.</p>}
    {feedback && <TalentNotice>{feedback}</TalentNotice>}{saveError && <TalentNotice error>{saveError}</TalentNotice>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={saving || serverSaving || conflict || !dirty} className={primaryClass} onClick={() => void save()}>{saving ? 'Saving…' : 'Save privacy choices'}</button>{conflict && <button type="button" disabled={saving || serverSaving} className={secondaryClass} onClick={() => void reviewLatest()}>Load latest choices</button>}<button type="button" disabled={saving || serverSaving} className={secondaryClass} onClick={() => void save(true)}><EyeOff className="size-4" aria-hidden="true" />Hide my work profile</button></div>
  </section>
}
