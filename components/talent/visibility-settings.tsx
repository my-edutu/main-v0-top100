'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldCheck, EyeOff } from 'lucide-react'
import type { TalentRecord, TalentVisibilityInput } from '@/lib/talent/types'
import { visibilityChoices, visibilitySnapshot, type TalentVisibilitySnapshot } from '@/lib/talent/visibility'
import { useTalentMember, type TalentMemberResource } from './use-talent'
import { useUnsavedChanges } from './use-unsaved-changes'
import { primaryClass, secondaryClass, TalentNotice } from './ui'

const OPTIONS = [
  { key: 'discoveryEnabled' as const, title: 'Appear in Talent Discovery', description: 'Allow your reviewed talent profile to appear publicly, including in search engines. Private documents and contact details are not included.' },
  { key: 'introductionsEnabled' as const, title: 'Receive organisation introductions', description: 'Review each organisation and opportunity before approving a proposed introduction. This does not give organisations access to your private documents.' },
  { key: 'promotionEnabled' as const, title: 'Allow Top100 to feature my talent profile', description: 'Allow approved public profile information to be considered for promotional stories. This does not guarantee a feature.' },
  { key: 'outreachEmailOptOut' as const, title: 'Opt out of talent-update emails', description: 'Stop talent-discovery update emails. Essential account and security messages remain separate.' },
]

type EditingChoices = { memberId: string; expected: TalentVisibilitySnapshot; choices: TalentVisibilityInput }
function fromRecord(record: TalentRecord): EditingChoices {
  return { memberId: record.profile_id, expected: visibilitySnapshot(record), choices: visibilityChoices(record) }
}
function choicesChanged(editing: EditingChoices | null) {
  return Boolean(editing && JSON.stringify(editing.choices) !== JSON.stringify(visibilityChoices(editing.expected)))
}

export function TalentVisibilitySettings() {
  const resource = useTalentMember()
  return <TalentVisibilityControls resource={resource} />
}

/** Embedded usage shares the editor's resource and write lock. Checkbox drafts
 * are separate from confirmed server state, including when a save fails. */
export function TalentVisibilityControls({ resource, embedded = false, onDirtyChange }: {
  resource: TalentMemberResource
  embedded?: boolean
  onDirtyChange?: (dirty: boolean) => void
}) {
  const { data, loading, disabled, error } = resource
  const [editing, setEditing] = useState<EditingChoices | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [saveError, setSaveError] = useState('')
  const [conflict, setConflict] = useState(false)
  const savingGate = useRef(false)
  const alive = useRef(true)
  const dirty = choicesChanged(editing)

  useEffect(() => {
    if (!data) { setEditing(null); return }
    setEditing(previous => previous?.memberId === data.talent.profile_id && choicesChanged(previous) ? previous : fromRecord(data.talent))
  }, [data])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false) }, [dirty, onDirtyChange])
  useUnsavedChanges(!embedded && dirty)

  if (disabled) return null
  if (loading && !data) return <p role="status" className="rounded-2xl border border-orange-100 p-5 text-sm text-stone-600">Loading talent visibility choices…</p>
  if (!data || !editing) return <div className="space-y-3"><TalentNotice error>{error || 'Loading your privacy choices…'}</TalentNotice><button type="button" className={secondaryClass} onClick={() => void resource.reload()}>Try again</button></div>

  const changedElsewhere = JSON.stringify(editing.expected) !== JSON.stringify(visibilitySnapshot(data.talent))
  const busy = saving || resource.saving
  async function save(withdraw = false) {
    if (!editing || savingGate.current || resource.saving) return
    savingGate.current = true
    setSaving(true)
    setFeedback('')
    setSaveError('')
    try {
      const record = await resource.mutate(withdraw ? { action: 'withdraw_visibility' } : {
        action: 'visibility', visibility: editing.choices, expectedVisibility: editing.expected,
      })
      if (!alive.current) return
      setEditing(fromRecord(record))
      setConflict(false)
      setFeedback(withdraw ? 'Discovery, introductions and promotion are off. Your saved email preference and awardee account are unchanged.' : 'Your privacy choices have been saved. Discovery still requires an approved public talent profile.')
    } catch (reason) {
      if (!alive.current) return
      const stale = (reason as { status?: number }).status === 409
      setConflict(stale)
      setSaveError(stale ? 'Your saved privacy choices changed elsewhere. Reload them before saving. This attempt did not overwrite those choices.' : reason instanceof Error ? reason.message : 'Your privacy choices were not confirmed.')
    } finally {
      savingGate.current = false
      if (alive.current) setSaving(false)
    }
  }
  async function reloadChoices() {
    if (busy || (dirty && !window.confirm('Discard these unsaved privacy choices and load the saved settings?'))) return
    const result = await resource.reload()
    if (result && alive.current) {
      setEditing(fromRecord(result.talent))
      setConflict(false)
      setSaveError('')
      setFeedback('Loaded your saved privacy choices. Review them before making a new change.')
    }
  }

  return <section aria-labelledby="talent-privacy-title" id="talent-privacy" className="rounded-[24px] border border-orange-200 bg-white p-5 sm:p-7">
    <div className="mb-5 flex gap-3">
      <ShieldCheck className="mt-1 size-6 shrink-0 text-orange-700" aria-hidden="true" />
      <div><h2 id="talent-privacy-title" className="text-xl font-semibold text-stone-900">Talent discovery & privacy</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">Choose how your talent profile is used. These choices are separate from your existing awardee recognition.</p>
      </div>
    </div>
    <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-950"><strong>Saved discovery permission:</strong> {data.talent.discovery_enabled ? 'On' : 'Off'}. Changing a checkbox below does not save it.</p>
    {error && <div className="mt-4"><TalentNotice error>{error} Your unsaved choices have been kept.</TalentNotice></div>}
    <div className="divide-y divide-stone-100">{OPTIONS.map(option => <label key={option.key} className="flex cursor-pointer items-start gap-3 py-4">
      <input id={`talent-consent-${option.key}`} type="checkbox" checked={editing.choices[option.key]} disabled={busy} onChange={event => {
        const checked = event.target.checked
        setFeedback('')
        setEditing(previous => previous ? { ...previous, choices: { ...previous.choices, [option.key]: checked } } : previous)
      }} aria-describedby={`talent-consent-${option.key}-hint`} className="mt-1 size-5 shrink-0 accent-orange-700 focus-visible:outline-orange-700" />
      <span><span className="block text-sm font-semibold text-stone-900">{option.title}</span><span id={`talent-consent-${option.key}-hint`} className="mt-1 block text-sm leading-6 text-stone-600">{option.description}</span></span>
    </label>)}</div>
    <p className="my-4 text-xs leading-5 text-stone-600">Turning discovery off stops new discovery access and withdraws pending introductions. Previously delivered emails, downloads and third-party search caches cannot be recalled instantly.</p>
    {(conflict || changedElsewhere) && <TalentNotice error>{saveError || 'Saved privacy choices changed while this form was open.'} <button type="button" className="min-h-11 font-semibold underline" disabled={busy} onClick={() => void reloadChoices()}>Reload saved choices</button></TalentNotice>}
    {saveError && !conflict && !changedElsewhere && <TalentNotice error>{saveError}</TalentNotice>}
    {feedback && <TalentNotice>{feedback}</TalentNotice>}
    <p aria-live="polite" className="mt-3 text-xs text-stone-600">{dirty ? 'You have unsaved privacy choices.' : 'These are your saved privacy choices.'}</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" disabled={busy || !dirty || conflict || changedElsewhere} className={primaryClass} onClick={() => void save()}>{saving ? 'Saving…' : 'Save privacy choices'}</button>
      <button type="button" disabled={busy} className={secondaryClass} onClick={() => void save(true)}><EyeOff className="size-4" aria-hidden="true" />Turn off talent discovery</button>
    </div>
    <p className="mt-3 text-xs leading-5 text-stone-500">Turn off talent discovery switches off discovery, introductions and promotion immediately after confirmation by the server. It preserves your saved email preference, even when this form is out of date.</p>
  </section>
}
