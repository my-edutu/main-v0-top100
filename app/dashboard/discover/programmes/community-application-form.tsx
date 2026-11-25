'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'

import {
  communityAnswerLimit, communityAnswerSchemas, communityApplicationSections,
  type CommunityAnswers, type CommunityQuestion,
} from '@/lib/programme-manager/community-application'

import { validateSocialLinks } from '@/lib/profile-contact'

import { useDashboardMember } from '../../_providers/dashboard-member'
import { CommunityCitySelect, CommunityRegionSelect } from './community-city-select'
import { changeProgrammeInterest, useProgrammeInterest } from './programme-interest-client'

type Country = { code: string; name: string }
type FieldError = { field: string; message: string }
type Notice = { text: string; error?: boolean }

const steps: readonly { title: string; questions: readonly CommunityQuestion[] }[] = communityApplicationSections
const fieldClass = 'mt-2 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-950 aria-invalid:border-red-700'
const primary = 'inline-flex min-h-12 items-center justify-center rounded-xl bg-[#ffdf45] px-5 text-sm font-semibold text-stone-950 hover:bg-[#f5d138] disabled:opacity-55'
const secondary = 'inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 disabled:opacity-55'

function QuestionField({ question, countries, countryCode, region, value, error, onChange }: {
  question: CommunityQuestion
  countries: Country[]
  countryCode: string
  region: string
  value: CommunityAnswers[CommunityQuestion['name']]
  error?: string
  onChange: (value: string | string[] | boolean) => void
}) {
  const { name, label, type, hint, options, required, autoComplete } = question
  const id = `community-${name}`
  const textValue = typeof value === 'string' ? value : ''
  const selected = Array.isArray(value) ? value : []
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined
  const description = <>
    {hint && <p id={`${id}-hint`} className="mt-1 text-sm leading-6 text-stone-600">{hint}</p>}
    {error && <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700">{error}</p>}
  </>
  const marker = required && <span aria-hidden="true" className="ml-1 text-red-700">*</span>
  const inputProps = {
    id, name, required, autoComplete, className: fieldClass, value: textValue,
    'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined,
  }

  if (type === 'checkboxes') {
    return <fieldset className="min-w-0" aria-describedby={describedBy}>
      <legend className="text-sm font-semibold text-stone-950">{label}</legend>
      <p className="mt-1 text-sm text-stone-600">Select all that apply.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options?.map((option, optionIndex) => <label key={option} className="flex min-h-12 items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm leading-5 has-checked:border-amber-500 has-checked:bg-amber-50">
          <input id={optionIndex === 0 ? id : undefined} type="checkbox" name={name} checked={selected.includes(option)}
            className="size-4 shrink-0 accent-stone-900" onChange={event => onChange(event.target.checked
              ? [...selected, option] : selected.filter(item => item !== option))} />
          <span>{option}</span>
        </label>)}
      </div>
      {description}
    </fieldset>
  }

  if (type === 'confirmation') {
    return <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <label className="flex items-start gap-3 text-sm leading-6">
        <input id={id} name={name} type="checkbox" required checked={value === true}
          className="mt-1 size-4 shrink-0 accent-stone-900" aria-describedby={describedBy}
          aria-invalid={error ? true : undefined} onChange={event => onChange(event.target.checked)} />
        <span><strong className="mb-1 block">Confirmation{marker}</strong>{label}</span>
      </label>
      {description}
    </div>
  }

  return <div>
    <label htmlFor={id} className="text-sm font-semibold leading-6 text-stone-950">{label}{marker}</label>
    {description}
    {name === 'region' ? <CommunityRegionSelect key={countryCode} {...inputProps} country={countryCode}
      onChange={event => onChange(event.target.value)} />
    : name === 'city' ? <CommunityCitySelect key={`${countryCode}:${region}`} id={id} className={fieldClass} country={countryCode}
      region={region} value={textValue} onChange={onChange} describedBy={describedBy} />
    : type === 'country' || type === 'choice'
      ? <select {...inputProps} onChange={event => onChange(event.target.value)}>
        <option value="">{type === 'country' ? 'Select your country' : 'Select an option'}</option>
        {type === 'country'
          ? countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)
          : options?.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      : type === 'textarea'
        ? <textarea {...inputProps} rows={4} maxLength={communityAnswerLimit(question)} onChange={event => onChange(event.target.value)} />
        : <input {...inputProps} type={type === 'url' ? 'text' : type} inputMode={type === 'url' ? 'url' : undefined}
          maxLength={communityAnswerLimit(question)} onChange={event => onChange(event.target.value)} />}
  </div>
}

export function CommunityApplicationForm({ countries }: { countries: Country[] }) {
  const { member } = useDashboardMember()
  const linkedIn = member.socialLinks?.find(link => link?.platform === 'linkedin')
  const savedLinkedIn = linkedIn && !validateSocialLinks([linkedIn]) ? linkedIn.url : ''
  const { interests, load, retry, remember, forget } = useProgrammeInterest(true)
  const application = interests.find(item => item.kind === 'community')
  const [draft, setDraft] = useState<CommunityAnswers>(() => ({ full_name: member.name, email: member.email, linkedin: savedLinkedIn }))
  const [stepIndex, setStepIndex] = useState(0)
  const [fieldError, setFieldError] = useState<FieldError>()
  const [notice, setNotice] = useState<Notice>()
  const [pending, setPending] = useState(false)
  const sectionHeading = useRef<HTMLHeadingElement>(null)
  const focusNextStep = useRef(false)
  const step = steps[stepIndex]
  const isFinal = stepIndex === steps.length - 1

  useEffect(() => {
    if (!focusNextStep.current) return
    focusNextStep.current = false
    sectionHeading.current?.focus()
    sectionHeading.current?.scrollIntoView({ block: 'start' })
  }, [stepIndex])

  useEffect(() => {
    if (fieldError) document.getElementById(`community-${fieldError.field}`)?.focus()
  }, [fieldError])

  function moveTo(index: number) {
    setFieldError(undefined)
    setNotice(undefined)
    focusNextStep.current = true
    setStepIndex(index)
  }

  function validate() {
    const sections = isFinal ? steps : [step]
    for (const section of sections) {
      for (const question of section.questions) {
        const result = communityAnswerSchemas[question.name].safeParse(draft[question.name])
        if (result.success) continue
        const index = steps.indexOf(section)
        if (index !== stepIndex) moveTo(index)
        setFieldError({ field: question.name, message: draft[question.name] === undefined && question.type !== 'confirmation'
          ? 'This answer is required.' : result.error.issues[0].message })
        return false
      }
    }
    return true
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !validate()) return
    if (!isFinal) {
      moveTo(stepIndex + 1)
      return
    }

    setPending(true)
    setNotice(undefined)
    try {
      const result = await changeProgrammeInterest('POST', {
        kind: 'community', activity_id: null, consent: draft.confirmation === true,
        community_details: { version: 2, answers: draft },
      })
      if (!result.ok || !result.interest) {
        const index = steps.findIndex(section => section.questions.some(question => question.name === result.field))
        if (result.field && index !== -1) {
          if (index !== stepIndex) moveTo(index)
          setFieldError({ field: result.field, message: result.message || 'Check this answer and try again.' })
          return
        }
        throw new Error(result.message || result.error || 'Your application could not be saved. Please try again.')
      }
      remember(result.interest)
      setNotice({ text: result.alreadyRecorded ? 'Your application is already on file.' : 'Thank you for your interest in making an impact.' })
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Your application could not be saved. Please try again.', error: true })
    } finally {
      setPending(false)
    }
  }

  async function withdraw(id: string) {
    if (pending) return
    setPending(true)
    setNotice(undefined)
    try {
      const result = await changeProgrammeInterest('DELETE', { id })
      if (!result.ok) throw new Error(result.message || 'Your application could not be withdrawn.')
      forget(id)
      setDraft({ full_name: member.name, email: member.email, linkedin: savedLinkedIn })
      moveTo(0)
      setNotice({ text: 'Your application was withdrawn.' })
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Your application could not be withdrawn.', error: true })
    } finally {
      setPending(false)
    }
  }

  return <section id="community-impact-network" aria-labelledby="community-impact-network-title" className="scroll-mt-24 space-y-6 text-stone-950">
    <header className="space-y-3 rounded-2xl bg-[#f5f4ed] p-5 sm:p-7">
      <p className="text-sm font-semibold text-stone-700">Top100 Africa Future Leaders</p>
      <h1 id="community-impact-network-title" className="text-2xl font-bold tracking-tight sm:text-3xl">Community Impact Network</h1>
      <p className="font-semibold">Expression of interest</p>
      <p className="text-sm leading-6 text-stone-700">Share your experience, skills or networks to help young African leaders access mentorship, practical training and new opportunities.</p>
      <details className="text-sm leading-6 text-stone-700">
        <summary className="w-fit cursor-pointer font-semibold underline underline-offset-4">About the network</summary>
        <div className="mt-3 space-y-3">
          <p className="font-semibold">Beyond Recognition. Beyond Borders. Beyond Limits.</p>
          <p>The network brings together experienced professionals, industry leaders, entrepreneurs, academics, innovators, creatives and changemakers who want to empower the next generation of African leaders.</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Speak at leadership sessions, webinars and empowerment programmes.</li>
            <li>Facilitate workshops, masterclasses and practical training.</li>
            <li>Mentor young African leaders and emerging professionals.</li>
            <li>Organise or co-host events and community programmes.</li>
            <li>Connect members to jobs, internships, scholarships, fellowships and partnerships.</li>
            <li>Share professional expertise, technical support, tools, platforms and other resources.</li>
          </ul>
          <p>An hour of advice, a workshop, a mentorship conversation or a professional introduction can help someone take their next step.</p>
        </div>
      </details>
    </header>

    {load === 'loading' && <p role="status" className="text-sm text-stone-600">Checking your application status…</p>}
    {load === 'error' && <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
      <p role="status" className="text-sm text-stone-800">We couldn’t check for a previous application. You can still complete and submit the form.</p>
      <button type="button" className="min-h-11 text-sm font-semibold underline underline-offset-4" onClick={retry} disabled={pending}>Retry status check</button>
    </div>}

    {application ? <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <div>
        <h2 className="text-lg font-semibold">Application received</h2>
        <p className="mt-1 text-sm leading-6">The Top100 team may contact you to discuss opportunities that match your experience and availability.</p>
      </div>
      <button type="button" className={secondary} disabled={pending} onClick={() => void withdraw(application.id)}>
        {pending ? 'Withdrawing…' : 'Withdraw application'}
      </button>
    </div> : <form noValidate onSubmit={submit} className="space-y-5 rounded-2xl border border-stone-200 bg-white p-4 sm:p-7">
      <div className="space-y-2">
        <p id="community-progress-label" className="text-sm font-medium text-stone-700">Step {stepIndex + 1} of {steps.length}</p>
        <progress aria-labelledby="community-progress-label" className="block h-2 w-full accent-amber-500" value={stepIndex + 1} max={steps.length} />
        <h2 ref={sectionHeading} tabIndex={-1} className="scroll-mt-24 text-xl font-semibold tracking-tight">{step.title}</h2>
        <p className="text-sm text-stone-600">Fields marked with an asterisk are required.</p>
      </div>
      <fieldset disabled={pending} aria-label={step.title} className="space-y-5">
        {step.questions.map(question => <QuestionField key={question.name} question={question} countries={countries}
          countryCode={String(draft.country_code ?? '')} region={String(draft.region ?? '')} value={draft[question.name]} error={fieldError?.field === question.name ? fieldError.message : undefined}
          onChange={value => {
            setDraft(current => ({
              ...current,
              [question.name]: value,
              ...(question.name === 'country_code' && current.country_code !== value ? { region: undefined, city: undefined } : {}),
              ...(question.name === 'region' && current.region !== value ? { city: undefined } : {}),
            }))
            if (fieldError?.field === question.name) setFieldError(undefined)
          }} />)}
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 border-t border-stone-200 pt-4">
        {stepIndex > 0 && <button type="button" className={secondary} disabled={pending} onClick={() => moveTo(stepIndex - 1)}>Back</button>}
        <button type="submit" className={primary} disabled={pending || (isFinal && load === 'loading')}>
          {isFinal ? pending ? 'Submitting…' : 'Submit expression of interest' : 'Continue'}
        </button>
      </div>
      {notice?.error && <p role="alert" className="text-sm text-red-700">{notice.text}</p>}
    </form>}
    {notice && (application || !notice.error) && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'text-sm text-red-700' : 'text-sm text-stone-700'}>{notice.text}</p>}
  </section>
}
