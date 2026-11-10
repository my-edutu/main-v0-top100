'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Eye, Save } from 'lucide-react'
import { emptyTalentDraft, parseTalentDraft, profileCompleteness, publicationBlockedReason } from '@/lib/talent/contracts'
import { DRAFT_FIELD_LABELS, draftsEquivalent, planDraftMerge, profileChecklist, reconcileSavedDraft, type DraftField } from '@/lib/talent/editor-state'
import { talentVisibilityStatus } from '@/lib/talent/visibility'
import type { TalentDraft } from '@/lib/talent/types'
import { useTalentMember } from './use-talent'
import { primaryClass, secondaryClass, TalentNotice } from './ui'
import { TalentVisibilityPanel } from './visibility-settings'
import { TalentProfileFields } from './profile-fields'
import { TalentDraftPreview } from './draft-preview'
import { useUnsavedChanges } from './use-unsaved-changes'

const STEPS = ['About you', 'Skills & experience', 'Work & education', 'Goals & availability', 'Review & visibility']
const STATUS_LABELS = { draft: 'Private draft', submitted: 'Awaiting review', approved: 'Reviewed', changes_requested: 'Changes requested' }
type Conflict = { merged: TalentDraft; remote: TalentDraft; remoteRevision: number; fields: DraftField[]; choices: Partial<Record<DraftField, 'local' | 'remote'>> }
const displayValue = (value: unknown) => typeof value === 'string' ? value || '(empty)' : JSON.stringify(value, null, 2)

export function TalentProfileEditor() {
  const member = useTalentMember()
  const { data, loading, error, disabled, reload, mutate, saving: serverSaving } = member
  const [draft, setDraft] = useState<TalentDraft>(emptyTalentDraft)
  const draftRef = useRef(draft)
  const baseDraft = useRef<TalentDraft>(draft)
  const baseRevision = useRef(0)
  const loadedOwner = useRef('')
  const active = useRef(true)
  const inFlight = useRef(false)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [privacyDirty, setPrivacyDirty] = useState(false)
  const [preview, setPreview] = useState(false)
  const [autoPaused, setAutoPaused] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [initialised, setInitialised] = useState(false)
  const replaceDraft = useCallback((next: TalentDraft) => { draftRef.current = next; setDraft(next) }, [])
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    if (data && loadedOwner.current !== data.talent.profile_id) {
      loadedOwner.current = data.talent.profile_id; baseDraft.current = data.talent.draft; baseRevision.current = data.talent.revision
      replaceDraft(data.talent.draft); setConflict(null); setAutoPaused(false); setInitialised(true)
    }
  }, [data, replaceDraft])
  const dirty = Boolean(initialised && data && !draftsEquivalent(draft, baseDraft.current))
  useEffect(() => {
    // A privacy response may include a newer draft saved in another tab. Do not
    // silently grant that revision to a locally edited form.
    if (!data || !initialised || inFlight.current || recovering || conflict || dirty) return
    if (data.talent.revision > baseRevision.current) {
      baseDraft.current = data.talent.draft; baseRevision.current = data.talent.revision
      replaceDraft(data.talent.draft)
    }
  }, [data, initialised, recovering, conflict, dirty, replaceDraft])
  useUnsavedChanges(dirty || privacyDirty || saving || serverSaving)

  const save = useCallback(async (submit = false, automatic = false) => {
    if (!data || !initialised || inFlight.current || serverSaving || conflict || recovering) return
    if (automatic && (autoPaused || draftsEquivalent(draftRef.current, baseDraft.current))) return
    const sent = draftRef.current
    const originalBase = baseDraft.current
    const owner = data.talent.profile_id
    setProblem(''); if (!automatic) setNotice('')
    let input: TalentDraft
    try {
      const blocked = submit ? publicationBlockedReason(sent) : null
      if (blocked) { setProblem(blocked); setStep(4); setPreview(false); return }
      input = parseTalentDraft(sent, submit ? 'publication' : 'draft')
    } catch (e) { setProblem(e instanceof Error ? e.message : 'Check your details.'); setAutoPaused(true); return }
    inFlight.current = true; setSaving(true)
    try {
      const result = { talent: await mutate({ action: submit ? 'submit' : 'save', expectedRevision: baseRevision.current, draft: input }) }
      if (!active.current || loadedOwner.current !== owner) return
      const next = automatic ? draftRef.current : reconcileSavedDraft(draftRef.current, sent, result.talent.draft)
      baseDraft.current = result.talent.draft; baseRevision.current = result.talent.revision; replaceDraft(next); setAutoPaused(false)
      const editedWhileSaving = !draftsEquivalent(next, result.talent.draft)
      setNotice(submit ? (editedWhileSaving ? 'The submitted snapshot is awaiting review. Your newer edits remain a private draft.' : 'Submitted for review. This does not enable discovery or verify every claim.') : (editedWhileSaving ? 'Earlier changes saved. Saving your newer edits next…' : 'Draft saved privately.'))
    } catch (e) {
      if (!active.current || loadedOwner.current !== owner) return
      setAutoPaused(true)
      if ((e as { status?: number }).status === 409) {
        setRecovering(true)
        const latest = await reload()
        if (!active.current || loadedOwner.current !== owner) return
        if (latest) {
          const plan = planDraftMerge(originalBase, draftRef.current, latest.talent.draft)
          if (plan.conflicts.length) setConflict({ merged: plan.merged, remote: latest.talent.draft, remoteRevision: latest.talent.revision, fields: plan.conflicts, choices: {} })
          else { baseDraft.current = latest.talent.draft; baseRevision.current = latest.talent.revision; replaceDraft(plan.merged); setNotice('A newer saved draft was found. Your edits and independent changes have been combined. Review them and select Save draft.') }
          setProblem(plan.conflicts.length ? 'Another tab changed some of the same details. Choose which version to keep below. Nothing has been overwritten.' : '')
        } else setProblem('Your form is still here, but the latest saved version could not be loaded. Reconnect and select Save draft to try again.')
      } else setProblem(e instanceof Error ? e.message : 'Saving failed. Your form is still here; try Save draft again.')
    } finally {
      inFlight.current = false
      if (active.current) { setSaving(false); setRecovering(false) }
    }
  }, [data, initialised, conflict, recovering, autoPaused, mutate, serverSaving, replaceDraft, reload])

  useEffect(() => {
    if (!dirty || saving || serverSaving || recovering || conflict || autoPaused || !initialised) return
    const timer = setTimeout(() => { void save(false, true) }, 1500)
    return () => clearTimeout(timer)
  }, [draft, dirty, saving, serverSaving, recovering, conflict, autoPaused, initialised, save])

  function update<K extends keyof TalentDraft>(key: K, value: TalentDraft[K]) {
    replaceDraft({ ...draftRef.current, [key]: value }); setNotice(''); setAutoPaused(false)
  }
  function goToStep(next: number, field = 'talent-step-title') {
    setStep(next); setPreview(false)
    requestAnimationFrame(() => document.getElementById(field)?.focus())
  }
  function applyConflictChoices() {
    if (!conflict || conflict.fields.some(field => !conflict.choices[field])) return
    const resolved = { ...conflict.merged }
    for (const field of conflict.fields) if (conflict.choices[field] === 'remote') Object.assign(resolved, { [field]: conflict.remote[field] })
    baseDraft.current = conflict.remote; baseRevision.current = conflict.remoteRevision; replaceDraft(resolved); setConflict(null); setProblem(''); setAutoPaused(true)
    setNotice('Your choices are in the form. Review them and select Save draft; no conflicting version was silently overwritten.')
  }
  if (disabled) return null
  if ((!data && loading) || (data && !initialised)) return <p role="status" className="p-5 text-stone-600">Loading your talent workspace…</p>
  if (!data) return <div className="space-y-3"><TalentNotice error>{error || 'Could not load your talent profile.'}</TalentNotice><button className={secondaryClass} type="button" onClick={() => void reload()}>Try again</button></div>
  const checklist = profileChecklist(draft)
  const pct = profileCompleteness(draft)
  const saveState = recovering ? 'Checking the latest saved draft…' : saving || serverSaving ? 'Saving… You can keep typing.' : dirty ? autoPaused ? 'Unsaved changes — select Save draft to retry.' : 'Unsaved changes — saving shortly.' : 'All draft changes saved.'
  return <section id="talent-profile" aria-labelledby="talent-profile-title" className="mb-8 overflow-hidden rounded-[28px] border border-stone-200 bg-white">
    <header className="border-b border-stone-200 bg-stone-50 p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id="talent-profile-title" className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">Your work profile</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-700">Add the skills and work you want employers to see. Your edits stay in a draft until Top100 approves them.</p></div><div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700">{STATUS_LABELS[data.talent.publication_status]}</span>
        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-stone-900">{talentVisibilityStatus(data.talent)}</span>
      </div></div>
      <div className="mt-5 max-w-md"><div className="mb-2 flex justify-between gap-3 text-xs font-medium text-stone-700"><span>Profile details completed</span><span>{pct}%</span></div><div role="progressbar" aria-label="Talent profile details completed" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500" style={{ width: `${pct}%` }} /></div></div>
    </header>
    <nav aria-label="Talent profile sections" className="flex gap-1 overflow-x-auto border-b border-stone-100 p-3 sm:px-5">{STEPS.map((label, index) => <button key={label} type="button" onClick={() => goToStep(index)} aria-current={step === index && !preview ? 'step' : undefined} className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium focus-visible:outline-orange-700 ${step === index && !preview ? 'bg-orange-100 text-orange-950' : 'text-stone-600 hover:bg-stone-50'}`}><span className="mr-2 text-xs">{index + 1}</span>{label}</button>)}</nav>
    <div className="grid lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="min-w-0 space-y-5 p-5 sm:p-7">
        {data.talent.review_note && <TalentNotice><strong>Review feedback:</strong> {data.talent.review_note}</TalentNotice>}
        {data.talent.published && data.talent.revision !== data.talent.published_revision && <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">Your last reviewed public version is unchanged. These newer details stay private until reviewed.</p>}
        {problem && <TalentNotice error>{problem}</TalentNotice>}
        {conflict && <section aria-labelledby="talent-conflict-title" className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50 p-4"><h3 id="talent-conflict-title" className="font-semibold text-stone-950">Resolve overlapping edits</h3>{conflict.fields.map(field => <fieldset key={field} className="min-w-0 space-y-2 rounded-xl border border-amber-200 bg-white p-3"><legend className="px-1 text-sm font-semibold">{DRAFT_FIELD_LABELS[field]}</legend>{(['local', 'remote'] as const).map(choice => <label key={choice} className="block rounded-lg border border-stone-200 p-3 text-sm"><span className="flex items-center gap-2"><input type="radio" name={`resolve-${field}`} className="accent-orange-700" checked={conflict.choices[field] === choice} onChange={() => setConflict({ ...conflict, choices: { ...conflict.choices, [field]: choice } })} />{choice === 'local' ? 'Keep my edits' : 'Use the newer saved version'}</span><span className="mt-2 block max-h-40 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-stone-600">{displayValue(choice === 'local' ? conflict.merged[field] : conflict.remote[field])}</span></label>)}</fieldset>)}<button type="button" className={secondaryClass} disabled={conflict.fields.some(field => !conflict.choices[field])} onClick={applyConflictChoices}>Apply my choices to the form</button></section>}
        {preview ? <TalentDraftPreview draft={draft} name={data.name} /> : <><div><p className="text-xs font-medium text-orange-800">Step {step + 1} of {STEPS.length}</p><h3 id="talent-step-title" tabIndex={-1} className="mt-1 text-lg font-semibold text-stone-900 outline-none">{STEPS[step]}</h3></div>{step < 4 ? <fieldset disabled={Boolean(conflict) || recovering} className="min-w-0"><legend className="sr-only">{STEPS[step]}</legend><TalentProfileFields step={step} draft={draft} update={update} /></fieldset> : <div className="space-y-5"><p className="text-sm leading-6 text-stone-700">Preview your draft, then send it to Top100. Save your visibility choices separately to decide whether employers can see the approved version.</p></div>}</>}
        <div hidden={preview || step !== 4}><TalentVisibilityPanel member={member} embedded onDirtyChange={setPrivacyDirty} /></div>
        {notice && <TalentNotice><span className="inline-flex items-start gap-2"><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{notice}</span></TalentNotice>}
      </div>
      <aside aria-label="Profile submission checklist" className="border-t border-stone-200 bg-stone-50 p-5 lg:border-l lg:border-t-0"><h3 className="text-sm font-semibold text-stone-950">Before you submit</h3><p className="mt-2 text-xs leading-5 text-stone-600">These details help organisations understand your profile. Other sections are optional.</p><div className="mt-4 space-y-2">{checklist.map(item => <button key={item.label} type="button" className="flex min-h-11 w-full items-center gap-2 rounded-lg text-left text-sm text-stone-700 hover:bg-orange-100 focus-visible:outline-orange-700" onClick={() => goToStep(item.step, item.field)}><span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${item.done ? 'border-orange-700 bg-orange-700 text-white' : 'border-stone-400'}`}>{item.done && <Check size={12} aria-hidden="true" />}</span><span><span className="sr-only">{item.done ? 'Complete: ' : 'Needed: '}</span>{item.label}</span></button>)}</div><button type="button" className={`${secondaryClass} mt-5 w-full`} aria-pressed={preview} onClick={() => setPreview(value => !value)}><Eye size={16} aria-hidden="true" />{preview ? 'Return to editing' : 'Preview my draft'}</button>{data.slug && <Link href={`/awardees/${encodeURIComponent(data.slug)}`} className="mt-3 flex min-h-11 items-center gap-2 text-sm font-medium text-orange-900">View current public profile <ArrowRight size={14} aria-hidden="true" /></Link>}<p className="mt-5 border-t border-orange-200 pt-4 text-xs leading-5 text-stone-600">Drafts save automatically after a pause. Privacy choices need their own Save action. Your award and existing account are not changed.</p></aside>
    </div>
    <footer className="flex flex-wrap items-center gap-3 border-t border-stone-200 bg-white p-5 sm:px-7"><button type="button" className={secondaryClass} disabled={saving || serverSaving || Boolean(conflict) || recovering || !dirty} onClick={() => void save()}><Save size={16} aria-hidden="true" />Save draft</button>{step > 0 && !preview && <button type="button" className={secondaryClass} onClick={() => goToStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Back</button>}{step < 4 && !preview ? <button type="button" className={primaryClass} onClick={() => goToStep(step + 1)}>Continue <ArrowRight size={16} aria-hidden="true" /></button> : <button type="button" className={primaryClass} disabled={saving || serverSaving || Boolean(conflict) || recovering || (data.talent.publication_status === 'submitted' && !dirty)} onClick={() => void save(true)}>{data.talent.publication_status === 'submitted' && !dirty ? 'Awaiting review' : 'Submit for review'}</button>}<p role="status" aria-live="polite" className="w-full text-xs leading-5 text-stone-600 sm:w-auto sm:flex-1">{saveState}</p></footer>
  </section>
}
