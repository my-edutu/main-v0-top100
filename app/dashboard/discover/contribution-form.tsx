'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

import { useDashboardMember } from '../_providers/dashboard-member'
import { CONTRIBUTION_AREAS, contributionSchema } from '@/lib/community-contributions'

const CURRENCIES = (() => {
  const preferred = ['NGN', 'USD']
  const supported = Intl.supportedValuesOf('currency')
  return [...preferred, ...supported.filter(code => !preferred.includes(code))]
})()

function getAreaOptions(campaign: 'volunteer' | 'give-back') {
  if (campaign === 'volunteer') return CONTRIBUTION_AREAS
  return CONTRIBUTION_AREAS.map(option => option.value === 'partnership-team'
    ? { ...option, label: 'Partnership proposals' }
    : option)
}

export function ContributionForm({ campaign }: { campaign: 'volunteer' | 'give-back' }) {
  const { member } = useDashboardMember()
  const [step, setStep] = useState(0)
  const [kind, setKind] = useState<'cash' | 'services'>('services')
  const [area, setArea] = useState('')
  const [details, setDetails] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const areaOptions = getAreaOptions(campaign)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || saved) return
    setError('')
    if (step === 0) {
      setStep(1)
      return
    }

    if (step === 1 && !area) {
      setError('Choose a team or programme to support.')
      return
    }

    const payload = { campaign, kind, area, name: member.name, details, amount, currency, consent }
    const result = contributionSchema.safeParse({ ...payload, consent: step < 3 ? true : consent })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }
    if (step < 3) {
      setStep(step + 1)
      return
    }

    setBusy(true)
    try {
      let body: BodyInit = JSON.stringify(payload)
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (receipt && kind === 'cash') {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => formData.set(key, String(value)))
        formData.set('receipt', receipt)
        body = formData
        delete headers['Content-Type']
      }
      const response = await fetch('/api/member/contributions', { method: 'POST', headers, body })
      const data = await response.json()
      if (!response.ok || !data.saved) throw new Error(data.message || 'Could not save. Please try again.')
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (saved) {
    return (
      <section className="mx-auto max-w-xl space-y-4 py-10">
        <h1 className="text-2xl font-medium">Thank you for supporting the community.</h1>
        <p role="status">Your contribution has been sent to the Top100 team for review. We’ll contact you at {member.email}.</p>
        {kind === 'cash' && <p className="text-sm">We’ll confirm your donation after reviewing the transfer and receipt.</p>}
        <Link href="/dashboard/discover" className="inline-flex min-h-12 items-center underline">Back to Discover</Link>
      </section>
    )
  }

  const descriptionLabel = campaign === 'give-back'
    ? 'Describe your programme, partnership proposal, or community idea'
    : 'Your skills or intended support, and when you can help'
  const campaignLabel = campaign === 'volunteer' ? 'Volunteer with Top100' : 'Give back to Top100'
  const headings = campaign === 'give-back'
    ? ['How would you like to give back?', 'What would you like to support?', 'Tell us about your idea.', 'Thank you for supporting the community.']
    : ['How would you like to contribute?', 'What would you like to support?', 'Tell us about your contribution.', 'Thank you for supporting the community.']

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-6 py-4">
      <header>
        <p className="text-xs text-orange-700">{campaignLabel} · {step + 1} of 4</p>
        <h1 className="mt-3 text-2xl font-medium">{headings[step]}</h1>
      </header>

      {step === 0 && (
        <fieldset className="space-y-3">
          <legend className="sr-only">Contribution type</legend>
          {(['services', 'cash'] as const).map(value => (
            <label key={value} className="flex min-h-16 items-center gap-3 rounded-xl border p-4">
              <input type="radio" name="kind" checked={kind === value} onChange={() => setKind(value)} />
              {value === 'services'
                ? campaign === 'give-back' ? 'Propose a programme or partnership' : 'Offer my skills or services'
                : 'Make a cash donation'}
            </label>
          ))}
          <p className="text-sm text-stone-600">{campaign === 'give-back' ? 'Share a programme idea, partnership proposal, or direct support for the community.' : 'The team reviews every offer. Cash donations are sent directly to Top100; no payment is collected here.'}</p>
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Choose a team or programme</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {areaOptions.map(option => (
              <label key={option.value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${area === option.value ? 'border-orange-500 bg-orange-50' : 'border-stone-200'}`}>
                <input type="radio" name="area" value={option.value} checked={area === option.value} onChange={() => setArea(option.value)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {kind === 'cash' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Donation amount<input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3" /></label>
              <label className="text-sm">Currency<select required value={currency} onChange={e => setCurrency(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3"><option value="">Choose currency</option>{CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}</select></label>
            </div>
          )}
          <label className="block text-sm">{descriptionLabel} <span className="text-stone-500">(optional)</span><textarea maxLength={3000} value={details} onChange={e => setDetails(e.target.value)} rows={6} className="mt-2 w-full rounded-xl border p-3" /></label>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Focus area: {areaOptions.find(option => option.value === area)?.label ?? area}</p>
          {kind === 'cash' ? (
            <>
              <div className="rounded-2xl border border-orange-200 bg-[#fff4e8] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Donation account details</p>
                <dl className="mt-4 space-y-3 text-sm text-stone-700">
                  <div className="flex justify-between gap-4"><dt>Bank</dt><dd className="font-semibold text-[#171412]">Fidelity Bank</dd></div>
                  <div className="flex justify-between gap-4"><dt>Account name</dt><dd className="text-right font-semibold text-[#171412]">Top100 Africa Future Leaders Hub</dd></div>
                  <div className="border-t border-orange-200 pt-3"><dt>Account number</dt><dd className="mt-1 text-2xl font-black tracking-[0.16em] text-[#171412]">5601792470</dd></div>
                </dl>
                <p className="mt-4 text-xs leading-5 text-stone-600">After transferring your donation, upload the receipt below so the team can confirm it.</p>
              </div>
              <label className="block rounded-xl border border-dashed border-stone-300 p-4 text-sm font-medium">Upload donation receipt <span className="font-normal text-stone-500">(optional)</span><input type="file" accept="image/*,application/pdf" onChange={e => setReceipt(e.target.files?.[0] ?? null)} className="mt-3 block w-full text-xs" /><span className="mt-2 block text-xs font-normal text-stone-500">JPG, PNG, WebP, or PDF up to 5 MB.</span>{receipt && <span className="mt-2 block text-xs text-emerald-700">Attached: {receipt.name}</span>}</label>
            </>
          ) : <p>{campaign === 'give-back' ? 'Programme or partnership proposal' : 'Skills or services'}</p>}
          {details && <p className="whitespace-pre-wrap break-words text-sm leading-6">{details}</p>}
          <p className="text-sm">Contact: {member.name} · {member.email}</p>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} required />I agree that the Top100 team may review this submission and contact me about it.</label>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-3">
        {step > 0 && <button type="button" disabled={busy} onClick={() => { setStep(step - 1); setError('') }} className="min-h-12 rounded-xl border px-5">Back</button>}
        <button disabled={busy} className="min-h-12 flex-1 rounded-xl px-5 text-black disabled:opacity-50" style={{ background: 'linear-gradient(90deg,#f97316,#f59e0b)' }}>{busy ? 'Submitting…' : step === 3 ? 'Send contribution' : 'Continue'}</button>
      </div>
    </form>
  )
}
