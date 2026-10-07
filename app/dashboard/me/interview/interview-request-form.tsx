'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { AvailabilityPreference, decodeAvailability, encodeAvailability, InterviewAvailabilityCalendar } from './interview-availability-calendar'

export type InterviewApplicationDraft = {
  id: string
  interview_topic: string
  impact_story: string
  request_format: string
  member_timezone: string
  preferred_windows: string[]
  additional_note: string | null
  booking_status: string
}

type Member = { name: string; email: string }
const stepTitles = ['Interview topic', 'Availability', 'Your impact', 'Review & consent']

function detectTimezone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos' } catch { return 'Africa/Lagos' }
}

export function InterviewRequestForm({
  member,
  application,
  onSaved,
  onCancelEdit,
  submissionEnabled = true,
}: {
  member: Member
  application: InterviewApplicationDraft | null
  onSaved: () => Promise<void>
  onCancelEdit: () => void
  submissionEnabled?: boolean
}) {
  const [step, setStep] = useState(0)
  const [topic, setTopic] = useState(application?.interview_topic ?? '')
  const [story, setStory] = useState(application?.impact_story ?? '')
  const [format, setFormat] = useState<'video' | 'written' | 'either'>(
    application?.request_format === 'video' || application?.request_format === 'written' ? application.request_format : 'either',
  )
  const [timezone, setTimezone] = useState(application?.member_timezone || detectTimezone())
  const [availability, setAvailability] = useState<AvailabilityPreference[]>(decodeAvailability(application?.preferred_windows))
  const [note, setNote] = useState(application?.additional_note ?? '')
  const [consent, setConsent] = useState(Boolean(application))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function continueToNextStep() {
    setError('')
    if (step === 0 && topic.trim().length < 10) {
      setError('Add at least 10 characters so the team knows what you would like to discuss.')
      return
    }
    if (step === 1 && !timezone.trim()) {
      setError('Add your time zone so the team can suggest a suitable time.')
      return
    }
    if (step === 2 && story.trim().length < 80) {
      setError('Tell us a little more about your impact (at least 80 characters).')
      return
    }
    setStep((current) => Math.min(current + 1, stepTitles.length - 1))
  }

  async function submit() {
    if (saving || !consent || !submissionEnabled) return
    setSaving(true)
    setError('')
    try {
      const response = await fetch(application ? `/api/member/interview/${application.id}` : '/api/member/interview', {
        method: application ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          impactStory: story,
          format,
          timezone,
          preferredWindows: encodeAvailability(availability),
          additionalNote: note,
          publicationConsent: consent,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'We could not send your request. Please try again.')
      toast.success(application ? 'Your interview request has been updated.' : 'Your interview request has been sent.')
      await onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We could not send your request. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="interview-form" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-5 py-5 sm:px-7 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-4 text-sm text-neutral-600">
          <span>Step {step + 1} of {stepTitles.length}</span>
          <span>{Math.round(((step + 1) / stepTitles.length) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-label="Interview request progress" aria-valuemin={1} aria-valuemax={stepTitles.length} aria-valuenow={step + 1}>
          <div className="h-full rounded-full bg-orange-500 transition-[width] duration-300" style={{ width: `${((step + 1) / stepTitles.length) * 100}%` }} />
        </div>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-neutral-950 sm:text-2xl">{stepTitles[step]}</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-600">
          {step === 0 ? 'Start with the conversation you want to have.' : null}
          {step === 1 ? 'Choose days that suit you. The team will check availability before confirming.' : null}
          {step === 2 ? 'Give the team the context to tell your story well.' : null}
          {step === 3 ? 'Check your details and tell us how we may use the interview.' : null}
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-start gap-3 rounded-xl bg-orange-50 px-4 py-3.5">
          <UserRound className="mt-0.5 size-5 shrink-0 text-orange-800" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-neutral-900">Requesting as {member.name}</p>
            <p className="mt-0.5 break-all text-sm text-neutral-600">{member.email} · <Link className="underline underline-offset-2" href="/dashboard/me/profile">Update profile</Link></p>
          </div>
        </div>

        {step === 0 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="interview-topic">What would you like to discuss?</Label>
              <Input id="interview-topic" maxLength={160} minLength={10} value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="The work or idea you want to share" className="min-h-12" />
              <p className="text-xs text-neutral-500">{topic.trim().length}/160 characters · at least 10</p>
            </div>
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">How would you like to be interviewed?</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ['either', 'I’m flexible', 'Video or written'],
                  ['video', 'Video conversation', 'A conversation with our team'],
                  ['written', 'Written interview', 'Answer questions in writing'],
                ] as const).map(([value, title, description]) => (
                  <button key={value} type="button" aria-pressed={format === value} onClick={() => setFormat(value)} className={`min-h-24 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${format === value ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 hover:bg-neutral-50'}`}>
                    <span className="block text-sm font-medium text-neutral-900">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-neutral-600">{description}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="interview-timezone">Your time zone</Label>
              <Input id="interview-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Africa/Lagos" autoComplete="off" className="min-h-12" />
              <p className="text-xs leading-5 text-neutral-500">Use an IANA name such as Africa/Lagos or Europe/London. Times will be discussed in this time zone.</p>
            </div>
            <InterviewAvailabilityCalendar values={availability} onChange={setAvailability} />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
              <p className="text-sm font-medium text-neutral-900">Your impact story</p>
              <p className="mt-1 text-sm leading-6 text-neutral-600">This is the main context the interviewer will use to prepare. Include what changed, who benefited, and what you learned.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-story">Tell us about the impact</Label>
              <Textarea id="interview-story" minLength={80} maxLength={2000} rows={12} value={story} onChange={(event) => setStory(event.target.value)} placeholder="Describe the challenge, what you did, who benefited, and what changed…" className="min-h-[280px] text-base leading-7" />
              <p className="text-xs text-neutral-500">{story.length}/2,000 characters · at least 80</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interview-note">Anything else for the team? <span className="font-normal text-neutral-500">Optional</span></Label>
              <Textarea id="interview-note" maxLength={500} rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Accessibility needs, pronunciation, or context to help us prepare" />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <dl className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 px-4 sm:px-5">
              <div className="py-4"><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Topic</dt><dd className="mt-1 break-words text-sm leading-6 text-neutral-900">{topic}</dd></div>
              <div className="py-4"><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Format</dt><dd className="mt-1 text-sm text-neutral-900">{format === 'either' ? 'Flexible: video or written' : format === 'video' ? 'Video conversation' : 'Written interview'}</dd></div>
              <div className="py-4"><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Availability</dt><dd className="mt-1 text-sm leading-6 text-neutral-900">{availability.length ? `${availability.length} preferred date${availability.length === 1 ? '' : 's'} selected` : 'Flexible on dates'} · {timezone}</dd></div>
              <div className="py-4"><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Impact story</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-900">{story}</dd></div>
              {note.trim() ? <div className="py-4"><dt className="text-xs font-medium uppercase tracking-wide text-neutral-500">Note for the team</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-900">{note}</dd></div> : null}
            </dl>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-4 text-sm leading-6 transition hover:bg-neutral-50">
              <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 size-4 shrink-0 accent-orange-600" />
              <span>I agree that Africa Future Leaders may record and publish this interview. <Link href="/privacy" target="_blank" className="underline underline-offset-2">Read our privacy information</Link>.</span>
            </label>
            <p className="text-xs leading-5 text-neutral-500">Your selected days are preferences, not a confirmed appointment. The team will review your request and contact you with a time to accept.</p>
            {!submissionEnabled ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-950">Preview only. We can’t send a request until interview scheduling is connected.</p> : null}
          </div>
        ) : null}

        {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800">{error}</p> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-neutral-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {step > 0 ? <Button type="button" variant="outline" onClick={() => { setError(''); setStep((current) => current - 1) }} className="min-h-11"><ArrowLeft className="mr-2 size-4" />Back</Button> : null}
            {application ? <Button type="button" variant="ghost" onClick={onCancelEdit} className="min-h-11">Cancel edit</Button> : null}
          </div>
          {step < stepTitles.length - 1 ? (
            <Button type="button" onClick={continueToNextStep} className="min-h-12 bg-orange-600 text-white hover:bg-orange-700">Continue<ArrowRight className="ml-2 size-4" /></Button>
          ) : (
            <Button type="button" disabled={saving || !consent || !submissionEnabled} onClick={() => void submit()} className="min-h-12 bg-orange-600 text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              {saving ? 'Sending request…' : !submissionEnabled ? 'Preview only' : application ? 'Save request changes' : 'Send interview request'}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
