'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, RefreshCw } from 'lucide-react'

import { RouteSection } from './_components/route-section'
import { Project100ApplicationStepper } from './project100-application-stepper'
import type { MemberProject100View } from '@/lib/project100/server'
import type { Project100ApplicationDraft } from '@/lib/project100/types'

const heroImages = [
  '/african-students-celebrating-achievement-at-gradua.jpg',
  '/young-african-woman-education-leader.jpg',
]

function message(body: unknown, fallback: string) {
  return typeof (body as { message?: unknown })?.message === 'string' ? (body as { message: string }).message : fallback
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
}

function countdown(deadline: string, now: number) {
  const milliseconds = Date.parse(deadline) - now
  if (milliseconds <= 0) return 'Applications are closed'
  const totalHours = Math.floor(milliseconds / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return `${days} day${days === 1 ? '' : 's'} and ${hours} hour${hours === 1 ? '' : 's'} remaining`
}

export function Project100ScholarshipSection() {
  const [view, setView] = useState<MemberProject100View | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showApplication, setShowApplication] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const response = await fetch('/api/member/project100', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(message(body, 'Could not load your scholarship application.'))
      setView(body as MemberProject100View)
    } catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Could not load your scholarship application.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(timer) }, [])

  const state = useMemo(() => view?.application?.status ?? 'new', [view?.application?.status])
  async function save(draft: Partial<Project100ApplicationDraft>) {
    setSaving(true)
    try {
      const response = await fetch('/api/member/project100', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(message(body, 'Could not save your draft.'))
      setView(body as MemberProject100View)
    } finally { setSaving(false) }
  }
  async function submit() {
    setSubmitting(true)
    try {
      const response = await fetch('/api/member/project100/submit', { method: 'POST' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(message(body, 'Could not submit your application.'))
      setView(body as MemberProject100View)
    } finally { setSubmitting(false) }
  }

  if (loading && !view) return <RouteSection title="Project100 Scholarship" description="Loading your application…"><div className="project100-loading" role="status">Loading Project100 Scholarship…</div></RouteSection>
  if (loadError && !view) return <RouteSection title="Project100 Scholarship"><section role="alert" className="rounded-[22px] border border-red-200 bg-white p-5"><h2 className="text-xl font-semibold">Your application did not load</h2><p className="mt-2 text-sm text-[#625B52]">{loadError}</p><button type="button" onClick={() => void load()} className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#171412] px-4 text-sm font-medium text-white"><RefreshCw className="mr-2 size-4" />Try again</button></section></RouteSection>
  if (!view) return null
  const isSubmitted = state === 'submitted'
  const closed = !view.canEdit && !isSubmitted

  return <RouteSection title="Project100 Scholarship" eyebrow="Member programme" description="Save your application as you go, then submit it when every answer is ready.">
    <section className="project100-hero overflow-hidden rounded-[24px] text-white">
      <div className="project100-hero-images" aria-hidden="true">{heroImages.map((src, index) => <Image key={src} src={src} alt="" fill priority={index === 0} sizes="(max-width: 768px) 100vw, 720px" className={index === 0 ? 'project100-hero-image is-current' : 'project100-hero-image'} />)}</div>
      <div className="project100-hero-scrim" />
      <div className="project100-hero-content"><p className="text-xs font-semibold uppercase tracking-[.16em]">Top100 Africa Future Leaders</p><h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Take your next step with Project100.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/90">Tell us about yourself, how you want to contribute, and the support that would make a difference.</p><dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-white/70">Application deadline</dt><dd className="mt-1 font-medium">{formatDate(view.schedule.applicationDeadline)}</dd></div><div><dt className="text-white/70">Programme kickoff</dt><dd className="mt-1 font-medium">{formatDate(view.schedule.kickoffAt)}</dd></div></dl></div>
    </section>
    <div className="project100-status-row rounded-2xl border border-[#E7DDCF] bg-[#FFFCF8] p-4"><CalendarDays className="size-5 shrink-0 text-[#9A3412]" aria-hidden="true" /><div><p className="font-medium text-[#171412]">{isSubmitted ? 'Application submitted' : closed ? 'Applications are closed' : countdown(view.schedule.applicationDeadline, now)}</p><p className="mt-1 text-sm leading-5 text-[#625B52]">{isSubmitted ? 'Your submitted answers are safely recorded and cannot be changed from your member account.' : closed ? 'The overview remains available, but the application is read-only because the deadline has passed.' : view.application ? 'Your saved draft is ready whenever you are.' : 'You can save each step and return later.'}</p></div></div>
    {isSubmitted ? <section className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-5" role="status"><CheckCircle2 className="size-6 text-emerald-700" aria-hidden="true" /><h2 className="mt-3 text-xl font-semibold text-[#171412]">Thank you — your application is submitted.</h2><p className="mt-2 text-sm leading-6 text-[#625B52]">We have received your Project100 Scholarship application.</p></section> : null}
    {!showApplication && !isSubmitted ? <button type="button" onClick={() => setShowApplication(true)} className="project100-primary min-h-12 rounded-xl px-5 font-medium" disabled={closed}>{closed ? 'Applications closed' : view.application ? 'Resume draft' : 'Get started'}</button> : null}
    {(showApplication || isSubmitted) ? <Project100ApplicationStepper application={view.application} canEdit={view.canEdit} saving={saving} submitting={submitting} onSave={save} onSubmit={submit} /> : null}
  </RouteSection>
}
