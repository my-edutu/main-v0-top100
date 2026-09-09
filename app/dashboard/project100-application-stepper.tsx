'use client'

import { useMemo, useState } from 'react'

import type { MemberProject100Application } from '@/lib/project100/server'
import type { Project100ApplicationDraft } from '@/lib/project100/types'
import { normalizeProject100Phone } from '@/lib/project100/validation'

type Props = {
  application: MemberProject100Application | null
  canEdit: boolean
  saving?: boolean
  submitting?: boolean
  onSave: (draft: Partial<Project100ApplicationDraft>) => Promise<void>
  onSubmit: () => Promise<void>
}

type Field = keyof Project100ApplicationDraft
type Answers = Record<Field, string | boolean>

const steps = [
  { label: 'Your details', fields: ['fullName', 'phone', 'country', 'location'] as Field[] },
  { label: 'Your participation', fields: ['interest', 'areaOfFunction', 'teamLeadPreference'] as Field[] },
  { label: 'Support and consent', fields: ['resourceSupportNeeds', 'consent'] as Field[] },
]

function answersFrom(application: MemberProject100Application | null): Answers {
  return {
    fullName: application?.fullName ?? '', phone: application?.phone ?? '',
    country: application?.country ?? '', location: application?.location ?? '',
    interest: application?.interest ?? '', areaOfFunction: application?.areaOfFunction ?? '',
    teamLeadPreference: application?.teamLeadPreference ?? '',
    resourceSupportNeeds: application?.resourceSupportNeeds ?? '', consent: application?.consent ?? false,
  }
}

function label(field: Field) {
  return ({ fullName: 'Full name', phone: 'Phone number', country: 'Country', location: 'Location', interest: 'Why are you interested?', areaOfFunction: 'Area of function', teamLeadPreference: 'Would you like to lead a team?', resourceSupportNeeds: 'Resource or support needs', consent: 'Consent' } as Record<Field, string>)[field]
}

function stepErrors(values: Answers, step: number) {
  const errors: Partial<Record<Field, string>> = {}
  for (const field of steps[step].fields) {
    if (field === 'consent') { if (!values.consent) errors.consent = 'Consent is required.'; continue }
    if (field === 'teamLeadPreference') { if (values.teamLeadPreference === '') errors.teamLeadPreference = 'Choose your team-lead preference.'; continue }
    const value = String(values[field]).trim()
    if (!value) errors[field] = `${label(field)} is required.`
  }
  if (step === 0 && values.phone && !normalizeProject100Phone(String(values.phone))) errors.phone = 'Use an international phone number.'
  return errors
}

export function Project100ApplicationStepper({ application, canEdit, saving = false, submitting = false, onSave, onSubmit }: Props) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Answers>(() => answersFrom(application))
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [saveError, setSaveError] = useState('')
  const disabled = !canEdit || saving || submitting
  const current = steps[step]
  const progress = `${step + 1} of ${steps.length}`
  const stepFields = useMemo(() => current.fields, [current.fields])

  function update(field: Field, value: string | boolean) {
    setValues(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }

  async function saveCurrent() {
    const nextErrors = stepErrors(values, step)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return false
    setSaveError('')
    try {
      await onSave(Object.fromEntries(stepFields.map(field => [field, values[field]])) as Partial<Project100ApplicationDraft>)
      return true
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save your draft. Please try again.')
      return false
    }
  }

  async function next() {
    if (!await saveCurrent()) return
    if (step < steps.length - 1) setStep(step + 1)
  }

  async function submit() {
    if (!await saveCurrent()) return
    setSaveError('')
    try { await onSubmit() } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Could not submit your application. Please try again.') }
  }

  return (
    <section className="project100-stepper rounded-[22px] border border-[#E7DDCF] bg-white p-4 sm:p-6" aria-label="Project100 scholarship application">
      <ol className="project100-progress" aria-label={`Application progress: ${progress}`}>
        {steps.map((item, index) => <li key={item.label} className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}><span>{index + 1}</span><span>{item.label}</span></li>)}
      </ol>
      <p className="mt-4 text-sm text-[#625B52]">Step {progress}</p>
      <form className="mt-5 space-y-5" onSubmit={event => { event.preventDefault(); void (step === steps.length - 1 ? submit() : next()) }} noValidate>
        <fieldset disabled={disabled} className="space-y-4">
          <legend className="text-xl font-semibold tracking-tight text-[#171412]">{current.label}</legend>
          {step === 0 ? <>
            <TextField field="fullName" value={String(values.fullName)} update={update} error={errors.fullName} autoComplete="name" />
            <TextField field="phone" value={String(values.phone)} update={update} error={errors.phone} hint="Use an international number, for example +2348012345678." autoComplete="tel" />
            <TextField field="country" value={String(values.country)} update={update} error={errors.country} autoComplete="country-name" />
            <TextField field="location" value={String(values.location)} update={update} error={errors.location} autoComplete="address-level2" />
          </> : null}
          {step === 1 ? <>
            <TextArea field="interest" value={String(values.interest)} update={update} error={errors.interest} />
            <TextField field="areaOfFunction" value={String(values.areaOfFunction)} update={update} error={errors.areaOfFunction} />
            <RadioField value={values.teamLeadPreference} update={update} error={errors.teamLeadPreference} />
          </> : null}
          {step === 2 ? <>
            <TextArea field="resourceSupportNeeds" value={String(values.resourceSupportNeeds)} update={update} error={errors.resourceSupportNeeds} />
            <label className="flex min-h-12 items-start gap-3 rounded-xl border border-[#E7DDCF] p-3 text-sm leading-6"><input type="checkbox" checked={Boolean(values.consent)} onChange={event => update('consent', event.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? 'project100-consent-error' : undefined} className="mt-1 size-4" /> <span>I confirm that the information in this application is accurate and I consent to its use for Project100 Scholarship administration.</span></label>
            {errors.consent ? <p id="project100-consent-error" className="text-sm text-red-700">{errors.consent}</p> : null}
          </> : null}
        </fieldset>
        {saveError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{saveError}</p> : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {step > 0 ? <button type="button" className="min-h-12 rounded-xl border border-[#D9D0C5] px-5" disabled={disabled} onClick={() => { setErrors({}); setSaveError(''); setStep(step - 1) }}>Back</button> : <span />}
          <button type="submit" className="project100-primary min-h-12 rounded-xl px-5 font-medium disabled:opacity-60" disabled={disabled}>{submitting ? 'Submitting…' : saving ? 'Saving…' : step === steps.length - 1 ? 'Submit application' : 'Save and continue'}</button>
        </div>
      </form>
    </section>
  )
}

function TextField({ field, value, update, error, hint, autoComplete }: { field: Exclude<Field, 'consent' | 'teamLeadPreference' | 'interest' | 'resourceSupportNeeds'>; value: string; update: (field: Field, value: string) => void; error?: string; hint?: string; autoComplete?: string }) {
  const id = `project100-${field}`
  return <div><label htmlFor={id} className="block text-sm font-medium">{label(field)}</label>{hint ? <p id={`${id}-help`} className="mt-1 text-xs text-[#625B52]">{hint}</p> : null}<input id={id} value={value} onChange={event => update(field, event.target.value)} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-help` : undefined} className="mt-2 min-h-12 w-full rounded-xl border border-[#CFC6BB] bg-white px-3 text-base" />{error ? <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{error}</p> : null}</div>
}
function TextArea({ field, value, update, error }: { field: 'interest' | 'resourceSupportNeeds'; value: string; update: (field: Field, value: string) => void; error?: string }) { const id = `project100-${field}`; return <div><label htmlFor={id} className="block text-sm font-medium">{label(field)}</label><textarea id={id} rows={4} value={value} onChange={event => update(field, event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="mt-2 w-full rounded-xl border border-[#CFC6BB] bg-white p-3 text-base" />{error ? <p id={`${id}-error`} className="mt-1 text-sm text-red-700">{error}</p> : null}</div> }
function RadioField({ value, update, error }: { value: string | boolean; update: (field: Field, value: boolean) => void; error?: string }) { return <fieldset><legend className="text-sm font-medium">Would you like to lead a team?</legend><div className="mt-2 flex gap-5"><label><input type="radio" name="project100-lead" checked={value === true} onChange={() => update('teamLeadPreference', true)} /> Yes</label><label><input type="radio" name="project100-lead" checked={value === false} onChange={() => update('teamLeadPreference', false)} /> No</label></div>{error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}</fieldset> }
