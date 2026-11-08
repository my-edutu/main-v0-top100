'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { TALENT_INTERESTS, TALENT_WORK_MODES, parseTalentRequest } from '@/lib/talent/contracts'
import { Field, inputClass, primaryClass, secondaryClass, TalentNotice } from './ui'

export function TalentRequestForm({ talentSlug = '' }: { talentSlug?: string }) {
  const key = useRef<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ organisation: '', website: '', contactName: '', email: '', title: '', kind: 'Employment', description: '', skills: '', country: '', workMode: 'Flexible', places: '1', compensation: '', deadline: '', consent: false })
  const update = <K extends keyof typeof form>(field: K, value: typeof form[K]) => setForm(previous => ({ ...previous, [field]: value }))
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    if (step === 0) { setStep(1); return }
    setBusy(true)
    try {
      const input = parseTalentRequest({ ...form, skills: form.skills.split(',').map(value => value.trim()).filter(Boolean), places: Number(form.places), talentSlug })
      if (!key.current) key.current = crypto.randomUUID()
      const response = await fetch('/api/talent-requests', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key.current }, body: JSON.stringify(input) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Your request could not be saved. Please try again.')
      setSent(true)
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Your request could not be saved.') }
    finally { setBusy(false) }
  }
  if (sent) return <section className="rounded-[28px] border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-8 text-center"><CheckCircle2 className="mx-auto size-12 text-orange-700" aria-hidden="true" /><h2 className="mt-5 text-2xl font-semibold text-stone-950">Your brief has been received.</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-stone-600">The Top100 team will review your organisation and opportunity before proposing any introductions. No member contact details have been shared.</p><p className="mt-3 text-sm text-stone-500">Submitting a brief does not guarantee a match or a placement.</p><Link href="/awardees" className={`${primaryClass} mt-6`}>Explore the network <ArrowRight className="size-4" aria-hidden="true" /></Link></section>
  return <form onSubmit={submit} className="overflow-hidden rounded-[28px] border border-stone-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-100 bg-orange-50/60 px-6 py-5"><p className="text-sm font-semibold text-orange-900">{step === 0 ? '1 of 2 · Your organisation' : '2 of 2 · Your opportunity'}</p><p className="flex items-center gap-1 text-xs text-stone-600"><ShieldCheck className="size-4" aria-hidden="true" />Reviewed before any introduction</p></div>
    <div className="space-y-5 p-6 sm:p-8">
      {talentSlug && <p className="rounded-xl bg-stone-50 p-3 text-sm text-stone-600">You are expressing interest in a specific profile. The member will decide whether to accept an introduction.</p>}
      {step === 0 ? <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Organisation name" htmlFor="request-org"><input id="request-org" className={inputClass} required minLength={2} maxLength={160} autoComplete="organization" value={form.organisation} onChange={event => update('organisation',event.target.value)} /></Field>
        <Field label="Organisation website" htmlFor="request-website" hint="Optional. Use a public https:// address."><input id="request-website" type="url" className={inputClass} maxLength={500} value={form.website} onChange={event => update('website',event.target.value)} placeholder="https://" /></Field>
        <Field label="Your name" htmlFor="request-name"><input id="request-name" className={inputClass} required minLength={2} maxLength={120} autoComplete="name" value={form.contactName} onChange={event => update('contactName',event.target.value)} /></Field>
        <Field label="Your work email" htmlFor="request-email" hint="We use this to follow up on your brief, not to expose member details."><input id="request-email" type="email" className={inputClass} required maxLength={200} autoComplete="email" value={form.email} onChange={event => update('email',event.target.value)} /></Field>
      </div> : <>
        <Field label="Role or programme title" htmlFor="request-title"><input id="request-title" className={inputClass} required minLength={5} maxLength={160} value={form.title} onChange={event => update('title',event.target.value)} placeholder="e.g. Graduate engineering internship" /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Opportunity type" htmlFor="request-kind"><select id="request-kind" className={inputClass} value={form.kind} onChange={event => update('kind',event.target.value)}>{TALENT_INTERESTS.map(item => <option key={item}>{item}</option>)}</select></Field><Field label="Number of places" htmlFor="request-places"><input id="request-places" type="number" min={1} max={1000} required className={inputClass} value={form.places} onChange={event => update('places',event.target.value)} /></Field></div>
        <Field label="What are you looking for?" htmlFor="request-description" hint="Describe the work, eligibility, responsibilities and what the member would gain."><textarea id="request-description" required minLength={30} maxLength={4000} rows={6} className={inputClass} value={form.description} onChange={event => update('description',event.target.value)} /></Field>
        <Field label="Relevant skills" htmlFor="request-skills" hint="Separate skills with commas. Maximum 20."><input id="request-skills" className={inputClass} maxLength={1600} value={form.skills} onChange={event => update('skills',event.target.value)} placeholder="Research, financial analysis, Excel" /></Field>
        <div className="grid gap-5 sm:grid-cols-2"><Field label="Location or eligible countries" htmlFor="request-country"><input id="request-country" className={inputClass} maxLength={100} value={form.country} onChange={event => update('country',event.target.value)} placeholder="e.g. Nigeria or remote across Africa" /></Field><Field label="Work arrangement" htmlFor="request-work"><select id="request-work" className={inputClass} value={form.workMode} onChange={event => update('workMode',event.target.value)}>{TALENT_WORK_MODES.map(item => <option key={item}>{item}</option>)}</select></Field></div>
        <Field label="Compensation or funding" htmlFor="request-compensation" hint="State the salary, stipend, funding or costs clearly. Do not leave unpaid terms hidden."><textarea id="request-compensation" className={inputClass} rows={3} required maxLength={300} value={form.compensation} onChange={event => update('compensation',event.target.value)} /></Field>
        <Field label="Application deadline" htmlFor="request-deadline" hint="Optional. Leave empty for a rolling opportunity."><input id="request-deadline" type="date" className={inputClass} value={form.deadline} onChange={event => update('deadline',event.target.value)} /></Field>
        <label className="flex min-h-11 items-start gap-3 rounded-xl bg-orange-50 p-4 text-sm leading-6 text-stone-700"><input type="checkbox" required checked={form.consent} onChange={event => update('consent',event.target.checked)} className="mt-1 size-5 shrink-0 accent-orange-700" /><span>I am authorised to submit this brief. Top100 may use these details to review the opportunity and contact me. I understand that introductions require member approval and that this does not grant access to member documents.</span></label>
      </>}
      {error && <TalentNotice kind="error">{error}</TalentNotice>}
      <div className="flex flex-wrap justify-between gap-3 border-t border-stone-100 pt-5">{step === 1 ? <button type="button" className={secondaryClass} onClick={() => setStep(0)} disabled={busy}><ArrowLeft className="size-4" aria-hidden="true" />Organisation details</button> : <span className="self-center text-xs text-stone-500">No account required to submit a brief.</span>}<button type="submit" className={primaryClass} disabled={busy}>{busy ? 'Saving your brief…' : step === 0 ? 'Describe your opportunity' : 'Submit for review'}<ArrowRight className="size-4" aria-hidden="true" /></button></div>
    </div>
  </form>
}
