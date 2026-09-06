'use client'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useDashboardMember } from '../_providers/dashboard-member'
import { contributionSchema } from '@/lib/community-contributions'

export function ContributionForm({ campaign }: { campaign: 'volunteer' | 'give-back' }) {
  const { member } = useDashboardMember()
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<'cash' | 'services'>('services')
  const [details, setDetails] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || saved) return
    setError('')
    if (step === 0) { setStep(1); return }
    const payload = { campaign, kind, name: member.name, details, amount, currency, consent }
    const result = contributionSchema.safeParse({ ...payload, consent: step === 1 ? true : consent })
    if (!result.success) { setError(result.error.issues[0].message); return }
    if (step === 1) { setStep(2); return }
    setBusy(true)
    try {
      const response = await fetch('/api/member/contributions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok || !data.saved) throw new Error(data.message || 'Could not save. Please try again.')
      setSaved(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.') }
    finally { setBusy(false) }
  }
  if (saved) return <section className="mx-auto max-w-xl space-y-4 py-10"><h1 className="text-2xl font-medium">Thank you for giving back.</h1><p role="status">Your submission has been saved for the Top100 team to review. We’ll contact you at {member.email}.</p>{kind === 'cash' && <p className="text-sm">This is a pledge only. No money has been collected.</p>}<Link href="/dashboard/discover" className="inline-flex min-h-12 items-center underline">Back to Discover</Link></section>
  return <form onSubmit={submit} className="mx-auto max-w-xl space-y-6 py-4">
    <header><p className="text-xs text-orange-700">{campaign === 'volunteer' ? 'Volunteer with Top100' : 'Create social impact'} · {step + 1} of 3</p><h1 className="mt-3 text-2xl font-medium">{['How would you like to contribute?', 'Tell us about your contribution.', 'Review and submit.'][step]}</h1></header>
    {step === 0 && <fieldset className="space-y-3"><legend className="sr-only">Contribution type</legend>{(['services','cash'] as const).map(value => <label key={value} className="flex min-h-16 items-center gap-3 rounded-xl border p-4"><input type="radio" name="kind" checked={kind === value} onChange={() => setKind(value)} />{value === 'services' ? 'Offer my skills or services' : 'Make a cash donation pledge'}</label>)}<p className="text-sm text-stone-600">The team reviews every offer. Cash pledges are not payments.</p></fieldset>}
    {step === 1 && <div className="space-y-5">{kind === 'cash' && <div className="grid grid-cols-2 gap-3"><label className="text-sm">Pledge amount<input type="number" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3" /></label><label className="text-sm">Currency<select required value={currency} onChange={e=>setCurrency(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3"><option value="">Choose currency</option>{Intl.supportedValuesOf('currency').map(code=><option key={code}>{code}</option>)}</select></label></div>}<label className="block text-sm">{campaign === 'give-back' ? 'Your initiative, who it helps, and the support you can offer' : 'Your skills or intended support, and when you can help'}<textarea required minLength={20} maxLength={3000} value={details} onChange={e=>setDetails(e.target.value)} rows={6} className="mt-2 w-full rounded-xl border p-3" /></label></div>}
    {step === 2 && <div className="space-y-4"><p>{kind === 'cash' ? `Cash pledge: ${currency} ${amount} (not charged)` : 'Skills or services'}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{details}</p><p className="text-sm">Contact: {member.name} · {member.email}</p><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1" checked={consent} onChange={e=>setConsent(e.target.checked)} required />I agree that the Top100 team may review this submission and contact me about it.</label></div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-3">{step > 0 && <button type="button" disabled={busy} onClick={()=>{setStep(step-1);setError('')}} className="min-h-12 rounded-xl border px-5">Back</button>}<button disabled={busy} className="min-h-12 flex-1 rounded-xl px-5 text-black disabled:opacity-50" style={{background:'linear-gradient(90deg,#f97316,#f59e0b)'}}>{busy ? 'Submitting…' : step === 2 ? 'Submit for review' : 'Continue'}</button></div>
  </form>
}
