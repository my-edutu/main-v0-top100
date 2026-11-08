'use client'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Plus, Save, Trash2 } from 'lucide-react'
import { TALENT_INTERESTS, TALENT_SECTORS, TALENT_WORK_MODES, emptyTalentDraft, parseTalentDraft, profileCompleteness, publicationBlockedReason, publicationRequirements } from '@/lib/talent/contracts'
import type { TalentDraft, TalentRecord } from '@/lib/talent/types'
import { useTalentMember } from './use-talent'
import { Field, inputClass, primaryClass, secondaryClass, TalentNotice } from './ui'
import { TalentVisibilityControls } from './visibility-settings'
import { useUnsavedChanges } from './use-unsaved-changes'

const STEPS = ['About you', 'Skills & experience', 'Work & education', 'Goals & availability', 'Visibility & review']
export function TalentProfileEditor() {
  const resource = useTalentMember()
  const { data, loading, error, disabled } = resource
  const [draft, setDraft] = useState<TalentDraft>(emptyTalentDraft)
  const [savedDraft, setSavedDraft] = useState<TalentDraft>(emptyTalentDraft)
  const [baseRevision, setBaseRevision] = useState(0)
  const [skillsText, setSkillsText] = useState('')
  const [languagesText, setLanguagesText] = useState('')
  const [privacyDirty, setPrivacyDirty] = useState(false)
  const loaded = useRef<string | null>(null)
  const edits = useRef(0)
  const savingGate = useRef(false)
  const alive = useRef(true)
  const focusAfterStep = useRef<string | null>(null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')

  const adopt = useCallback((record: TalentRecord) => {
    setDraft(record.draft)
    setSavedDraft(record.draft)
    setBaseRevision(record.revision)
    setSkillsText(record.draft.skills.join(', '))
    setLanguagesText(record.draft.languages.join(', '))
    edits.current += 1
  }, [])
  useEffect(() => {
    if (data && loaded.current !== data.talent.profile_id) {
      adopt(data.talent)
      loaded.current = data.talent.profile_id
    }
  }, [data, adopt])
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  useEffect(() => {
    if (focusAfterStep.current) document.getElementById(focusAfterStep.current)?.focus()
    focusAfterStep.current = null
  }, [step])
  const dirty = Boolean(data && JSON.stringify(draft) !== JSON.stringify(savedDraft))
  useUnsavedChanges(dirty || privacyDirty)
  if (disabled) return null
  if (loading && !data) return <p role="status" className="p-5 text-stone-600">Loading your talent workspace…</p>
  if (!data) return <div className="space-y-3"><TalentNotice error>{error || 'Could not load your talent profile.'}</TalentNotice><button className={secondaryClass} type="button" onClick={() => void resource.reload()}>Try again</button></div>
  const update = <K extends keyof TalentDraft>(key: K, value: TalentDraft[K]) => {
    edits.current += 1
    setDraft(old => ({ ...old, [key]: value }))
    setNotice('')
  }
  const pct = profileCompleteness(draft)
  const requirements = publicationRequirements(draft)
  const newerSavedVersion = data.talent.revision !== baseRevision
  const busy = saving || resource.saving
  function goToStep(index: number, field = 'talent-step-title') {
    focusAfterStep.current = field
    if (step === index) document.getElementById(field)?.focus()
    setStep(index)
  }
  async function reloadSaved() {
    if (busy || (dirty && !window.confirm('Replace your unsaved profile edits with the latest saved version?'))) return
    const result = await resource.reload()
    // A failed read never clears the local draft or pretends it was replaced.
    if (result && alive.current) { adopt(result.talent); setProblem(''); setNotice('Loaded the latest saved profile.') }
  }
  async function save(submit = false) {
    if (!data || savingGate.current || resource.saving) return
    savingGate.current = true
    setProblem('')
    setNotice('')
    const submittedAtEdit = edits.current
    try {
      const input = parseTalentDraft(draft)
      const blocked = submit ? publicationBlockedReason(input) : null
      if (blocked) { setProblem(blocked); return }
      setSaving(true)
      // Use the revision this editor actually loaded, not a newer background
      // privacy/read receipt that the member has not reviewed.
      const record = await resource.mutate({ action: submit ? 'submit' : 'save', expectedRevision: baseRevision, draft: input })
      if (!alive.current) return
      setSavedDraft(record.draft)
      setBaseRevision(record.revision)
      if (edits.current === submittedAtEdit) {
        setDraft(record.draft)
        setSkillsText(record.draft.skills.join(', '))
        setLanguagesText(record.draft.languages.join(', '))
        setNotice(submit ? 'Submitted for review. Discovery still depends on your saved privacy choices.' : 'Draft saved. Unreviewed changes remain private.')
      } else {
        setNotice(submit ? 'The earlier version was submitted. Your newer edits are still here and remain unsaved.' : 'The earlier edits were saved. Your newer edits are still here and remain unsaved.')
      }
    } catch (reason) {
      if (alive.current) setProblem(reason instanceof Error ? reason.message : 'Could not confirm the save. Your form is still here.')
    } finally {
      savingGate.current = false
      if (alive.current) setSaving(false)
    }
  }
  return <section id="talent-profile" aria-labelledby="talent-profile-title" className="mb-8 rounded-[28px] border border-orange-200 bg-white">
    <header className="rounded-t-[28px] border-b border-orange-100 bg-gradient-to-br from-orange-50 via-amber-50 to-white p-5 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-800">Impact Beyond Recognition</p><div className="mt-3 flex flex-wrap items-start justify-between gap-4"><div><h2 id="talent-profile-title" className="text-2xl font-semibold tracking-tight text-stone-950 sm:text-3xl">Make your potential easier to discover.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">Your profile now has space for your skills, work and next ambitions. Build it here, choose your visibility and submit it for review.</p></div><span className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900">{data.talent.publication_status.replaceAll('_', ' ')}</span></div><div className="mt-6 max-w-md"><div className="mb-2 flex justify-between text-xs font-medium text-stone-700"><span>Profile readiness — not a talent score</span><span>{pct}%</span></div><div role="progressbar" aria-label="Talent profile completeness" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500" style={{ width: `${pct}%` }} /></div></div></header>
    <nav aria-label="Talent profile sections" className="flex gap-2 overflow-x-auto border-b border-stone-100 p-3 sm:px-6">{STEPS.map((label, index) => <button key={label} type="button" onClick={() => goToStep(index)} aria-current={step === index ? 'step' : undefined} className={`min-h-11 shrink-0 rounded-xl px-3 text-sm font-medium focus-visible:outline-orange-700 ${step === index ? 'bg-orange-100 text-orange-950' : 'text-stone-600 hover:bg-stone-50'}`}><span className="mr-2 opacity-60">{index + 1}</span>{label}</button>)}</nav>
    <div className="space-y-6 p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="talent-step-title" tabIndex={-1} className="text-lg font-semibold text-stone-900 outline-none">{STEPS[step]}</h3>
        <span className="text-xs text-stone-500">Step {step + 1} of {STEPS.length}</span>
      </div>
      {error && <TalentNotice error>{error} Your current form has been kept.</TalentNotice>}
      {newerSavedVersion && <TalentNotice>A newer saved version exists. Reload it before saving this editor; your current text has not been replaced. <button type="button" className="min-h-11 font-semibold underline" disabled={busy} onClick={() => void reloadSaved()}>Reload saved version</button></TalentNotice>}
      {data.talent.published && <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">Your public talent profile still shows the last approved version. Saving this draft does not replace it.</p>}
      {data.talent.review_note && <TalentNotice><strong>Review feedback:</strong> {data.talent.review_note}</TalentNotice>}
      {step === 0 && <div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Field htmlFor="talent-headline" label="Professional headline" hint="Describe what you do, not just the award you received."><input id="talent-headline" className={inputClass} maxLength={160} value={draft.headline} onChange={e => update('headline', e.target.value)} placeholder="For example: Graduate engineer interested in clean energy" /></Field></div><div className="sm:col-span-2"><Field htmlFor="talent-summary" label="A short introduction" hint="What can you contribute, and what kind of work matters to you?"><textarea id="talent-summary" className={inputClass} rows={5} maxLength={1600} value={draft.summary} onChange={e => update('summary', e.target.value)} /></Field></div><Field htmlFor="talent-sector" label="Primary sector"><select id="talent-sector" className={inputClass} value={draft.sector} onChange={e => update('sector', e.target.value)}><option value="">Choose a sector</option>{TALENT_SECTORS.map(s => <option key={s}>{s}</option>)}</select></Field><Field htmlFor="talent-country" label="Country of residence" hint="Where you are based, not a ranking criterion."><input id="talent-country" className={inputClass} maxLength={100} autoComplete="country-name" value={draft.country} onChange={e => update('country', e.target.value)} /></Field><Field htmlFor="talent-city" label="City — optional"><input id="talent-city" className={inputClass} maxLength={100} autoComplete="address-level2" value={draft.city} onChange={e => update('city', e.target.value)} /></Field></div>}
      {step === 1 && <div className="space-y-5"><Field htmlFor="talent-skills" label="Your strongest skills" hint="Separate skills with commas. Up to 20; keep them specific and honest."><input id="talent-skills" className={inputClass} value={skillsText} onChange={e => { setSkillsText(e.target.value); update('skills', e.target.value.split(',').map(item => item.trim()).filter(Boolean)) }} placeholder="Research, financial analysis, Python" /></Field><Field htmlFor="talent-languages" label="Languages" hint="Separate languages with commas. Up to 10."><input id="talent-languages" className={inputClass} value={languagesText} onChange={e => { setLanguagesText(e.target.value); update('languages', e.target.value.split(',').map(item => item.trim()).filter(Boolean)) }} placeholder="English, French" /></Field><Field htmlFor="talent-experience" label="Relevant experience" hint="Include employment, volunteering, research or practical responsibilities."><textarea id="talent-experience" className={inputClass} rows={6} maxLength={2400} value={draft.experience} onChange={e => update('experience', e.target.value)} /></Field><div className="grid gap-5 sm:grid-cols-2"><Field htmlFor="talent-portfolio" label="Portfolio link — optional"><input id="talent-portfolio" type="url" maxLength={500} className={inputClass} value={draft.portfolioUrl} onChange={e => update('portfolioUrl', e.target.value)} placeholder="https://…" /></Field><Field htmlFor="talent-linkedin" label="LinkedIn link — optional"><input id="talent-linkedin" type="url" maxLength={500} className={inputClass} value={draft.linkedinUrl} onChange={e => update('linkedinUrl', e.target.value)} placeholder="https://…" /></Field></div><p className="text-xs leading-5 text-stone-600">Skills and experience are labelled self-reported unless a specific supporting claim has been reviewed.</p></div>}
      {step === 2 && <div className="space-y-8"><section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-stone-900">Selected work</h3><p className="mt-1 text-sm text-stone-600">Show your contribution and its result. Only add links you are comfortable making public.</p></div><button type="button" className={secondaryClass} disabled={draft.projects.length >= 8} onClick={() => update('projects', [...draft.projects, { title: '', role: '', description: '', outcome: '', url: '' }])}><Plus size={16} />Add project</button></div>{draft.projects.length === 0 && <p className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-5 text-sm leading-6 text-stone-600">A research project, community initiative or practical piece of work can help an organisation understand your strengths. You can add one later.</p>}{draft.projects.map((p, index) => <fieldset key={index} className="mb-5 min-w-0 space-y-4 rounded-2xl border border-stone-200 p-4 sm:p-5"><legend className="px-2 text-sm font-semibold">Project {index + 1}</legend><div className="grid gap-4 sm:grid-cols-2">{(['title', 'role'] as const).map(key => <Field key={key} htmlFor={`project-${index}-${key}`} label={key === 'title' ? 'Project title' : 'Your role'}><input id={`project-${index}-${key}`} maxLength={key === 'title' ? 120 : 160} className={inputClass} value={p[key]} onChange={e => update('projects', draft.projects.map((item, n) => n === index ? { ...item, [key]: e.target.value } : item))} /></Field>)}</div>{(['description', 'outcome', 'url'] as const).map(key => <Field key={key} htmlFor={`project-${index}-${key}`} label={{ description: 'Problem and your contribution', outcome: 'Result or what you learned', url: 'Public supporting link — optional' }[key]}>{key === 'url' ? <input id={`project-${index}-${key}`} type="url" maxLength={500} className={inputClass} value={p[key]} onChange={e => update('projects', draft.projects.map((item, n) => n === index ? { ...item, [key]: e.target.value } : item))} /> : <textarea id={`project-${index}-${key}`} maxLength={key === 'description' ? 1200 : 800} className={inputClass} rows={3} value={p[key]} onChange={e => update('projects', draft.projects.map((item, n) => n === index ? { ...item, [key]: e.target.value } : item))} />}</Field>)}<button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm text-red-800" onClick={() => update('projects', draft.projects.filter((_, n) => n !== index))}><Trash2 size={16} />Remove project {index + 1}</button></fieldset>)}</section><section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold text-stone-900">Education</h3><button type="button" className={secondaryClass} disabled={draft.education.length >= 8} onClick={() => update('education', [...draft.education, { institution: '', qualification: '', field: '', year: '' }])}><Plus size={16} />Add education</button></div>{draft.education.map((e, index) => <fieldset key={index} className="mb-4 min-w-0 rounded-2xl border border-stone-200 p-4"><legend className="px-2 text-sm font-semibold">Education {index + 1}</legend><div className="grid gap-4 sm:grid-cols-2">{(['institution', 'qualification', 'field', 'year'] as const).map(key => <Field key={key} htmlFor={`education-${index}-${key}`} label={{ institution: 'Institution', qualification: 'Qualification', field: 'Field of study', year: 'Graduation year — optional' }[key]}><input id={`education-${index}-${key}`} maxLength={key === 'year' ? 4 : 160} className={inputClass} value={e[key]} onChange={event => update('education', draft.education.map((item, n) => n === index ? { ...item, [key]: event.target.value } : item))} /></Field>)}</div><button type="button" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-red-800" onClick={() => update('education', draft.education.filter((_, n) => n !== index))}><Trash2 size={16} />Remove education {index + 1}</button></fieldset>)}</section></div>}
      {step === 3 && <div className="space-y-6"><fieldset><legend className="mb-3 text-sm font-semibold text-stone-900">Which opportunities interest you?</legend><div className="grid gap-2 sm:grid-cols-2">{TALENT_INTERESTS.map(interest => <label key={interest} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-sm text-stone-800"><input type="checkbox" className="size-4 accent-orange-700" checked={draft.interests.includes(interest)} onChange={e => update('interests', e.target.checked ? [...draft.interests, interest] : draft.interests.filter(i => i !== interest))} />{interest}</label>)}</div></fieldset><Field htmlFor="talent-workmode" label="Work preference"><select id="talent-workmode" className={inputClass} value={draft.workMode} onChange={e => update('workMode', e.target.value as TalentDraft['workMode'])}>{TALENT_WORK_MODES.map(mode => <option key={mode}>{mode}</option>)}</select></Field><Field htmlFor="talent-availability" label="Availability" hint="For example: available from January, part-time research, or open to conversations."><input id="talent-availability" className={inputClass} maxLength={160} value={draft.availability} onChange={e => update('availability', e.target.value)} /></Field></div>}
      {step === 4 && <div className="space-y-6">
        <section aria-labelledby="talent-review-checklist" className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5">
          <h3 id="talent-review-checklist" className="text-lg font-semibold">Ready for a content review?</h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">These are profile details, not a talent ranking. A photograph, paid award package or private certificate is not required.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">{requirements.map(item => <li key={item.field}><button type="button" onClick={() => goToStep(item.step, item.field)} className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm text-stone-800 focus-visible:outline-orange-700"><span aria-hidden="true" className={item.complete ? 'text-emerald-700' : 'text-orange-700'}>{item.complete ? '✓' : '○'}</span><span>{item.label}<span className="sr-only">{item.complete ? ' — complete' : ' — needs attention'}</span></span></button></li>)}</ul>
        </section>
        <section aria-label="Your talent draft preview" className="rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-800">Your draft preview — not yet public</p>
          <h3 className="mt-3 break-words text-xl font-semibold text-stone-950">{draft.headline || 'Add your professional headline'}</h3>
          <p className="mt-2 text-sm text-stone-500">{[draft.sector, draft.country].filter(Boolean).join(' · ')}</p>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-stone-700">{draft.summary || 'Your short introduction will appear here.'}</p>
          <div className="mt-4 flex flex-wrap gap-2">{[...new Set(draft.skills.filter(skill => skill.trim()))].map(skill => <span key={skill} className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-900">{skill}</span>)}</div>
          <p className="mt-4 text-sm text-stone-600">Interested in: {draft.interests.join(', ') || 'Choose your opportunity interests'}</p>
          {draft.projects.length > 0 && <p className="mt-3 break-words text-sm text-stone-600">Selected work: {draft.projects.map(project => project.title).filter(Boolean).join(' · ')}</p>}
          <p className="mt-4 text-xs leading-5 text-stone-500">Claims remain self-reported unless a specific supporting claim is checked. Review is not a promise of employment or funding.</p>
          <Link href={`/awardees/${encodeURIComponent(data.slug)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-800">View your existing awardee profile <ArrowRight size={16} aria-hidden="true" /></Link>
        </section>
      </div>}
      <div hidden={step !== 4}><TalentVisibilityControls resource={resource} embedded onDirtyChange={setPrivacyDirty} /></div>
      {notice && <TalentNotice><span className="inline-flex items-start gap-2"><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />{notice}</span></TalentNotice>}
      {problem && <div className="space-y-3"><TalentNotice error>{problem}</TalentNotice><button type="button" className={secondaryClass} disabled={busy} onClick={() => void reloadSaved()}>Reload saved version</button></div>}
      <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 bg-white pt-5">
        {step > 0 && <button type="button" className={secondaryClass} onClick={() => goToStep(step - 1)}><ArrowLeft size={16} aria-hidden="true" />Back</button>}
        <button type="button" className={secondaryClass} disabled={busy || newerSavedVersion} onClick={() => void save()}><Save size={16} aria-hidden="true" />{saving ? 'Saving…' : 'Save draft'}</button>
        {step < 4 ? <button type="button" className={primaryClass} onClick={() => goToStep(step + 1)}>Continue <ArrowRight size={16} aria-hidden="true" /></button> : <button type="button" className={primaryClass} disabled={busy || newerSavedVersion} onClick={() => void save(true)}>Submit for review <ArrowRight size={16} aria-hidden="true" /></button>}
        <span aria-live="polite" className="basis-full text-xs leading-5 text-stone-600">{dirty ? 'You have unsaved profile edits.' : baseRevision ? 'Your draft is saved.' : 'Save whenever you are ready.'}{privacyDirty ? ' Privacy choices are also unsaved; save them separately above.' : ''}</span>
      </div>
    </div>
  </section>
}
