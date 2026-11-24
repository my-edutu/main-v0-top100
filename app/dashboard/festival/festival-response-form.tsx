'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FESTIVAL_DATE, FESTIVAL_VENUE, canAttendFestival } from '@/lib/festival/config'
import { festivalRequest } from '@/lib/festival/client'
import { festivalDispatchSchema, festivalRsvpSchema, type FestivalDispatch, type FestivalResponse } from '@/lib/festival/interest'
import { DeliveryCostChecker, type DeliveryQuoteDraft } from '../_components/delivery-cost-checker'
import { RouteSection } from '../_components/route-section'
import { useDashboardMember } from '../_providers/dashboard-member'
import { FestivalRsvpFields } from './festival-rsvp-fields'

const endpoint = '/api/member/festival-rsvp'
const rsvpHref = '/dashboard/festival/rsvp'
const dispatchHref = '/dashboard/festival/dispatch'
const fieldClass = 'block space-y-1.5 text-sm font-medium text-neutral-800'
const dispatchFields: { key: keyof FestivalDispatch; label: string; required: boolean; autoComplete: string; type?: string }[] = [
  { key: 'recipient', label: 'Recipient name', required: true, autoComplete: 'shipping name' },
  { key: 'phone', label: 'Phone with country code', required: true, autoComplete: 'shipping tel', type: 'tel' },
  { key: 'country', label: 'Country', required: true, autoComplete: 'shipping country-name' },
  { key: 'city', label: 'City', required: true, autoComplete: 'shipping address-level2' },
  { key: 'region', label: 'State, region or province (optional)', required: false, autoComplete: 'shipping address-level1' },
  { key: 'address', label: 'Street address', required: true, autoComplete: 'shipping street-address' },
  { key: 'postalCode', label: 'Postal code (if applicable)', required: false, autoComplete: 'shipping postal-code' },
]

export function FestivalResponseForm({ mode }: { mode: 'rsvp' | 'dispatch' }) {
  const { member } = useDashboardMember()
  const eligible = canAttendFestival(member.status)
  const [response, setResponse] = useState<FestivalResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [followUp, setFollowUp] = useState<{ draft: DeliveryQuoteDraft | null; hasEstimate: boolean } | null>(null)
  const dispatchForm = useRef<HTMLFormElement>(null)
  const dispatch = mode === 'dispatch'

  useEffect(() => {
    if (!eligible) return
    const controller = new AbortController()
    festivalRequest<{ response: FestivalResponse | null }>(endpoint, { signal: controller.signal })
      .then(({ response }) => { if (!controller.signal.aborted) setResponse(response) })
      .catch(() => { if (!controller.signal.aborted) setLoadFailed(true) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [eligible, member.id])

  useEffect(() => {
    if (followUp) dispatchForm.current?.focus()
  }, [followUp])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setError('')
    setSaved(false)
    const form = new FormData(event.currentTarget)
    const attending = form.get('attending')
    const contact = (person: 'awardee' | 'guest') => ({
      name: form.get(`${person}-name`),
      email: form.get(`${person}-email`),
      phone: form.get(`${person}-phone`),
    })
    const parsed = dispatch
      ? festivalDispatchSchema.safeParse(Object.fromEntries(dispatchFields.map(({ key }) => [key, form.get(key)])))
      : festivalRsvpSchema.safeParse({
          attending: attending === null ? null : attending === 'yes',
          awardee: contact('awardee'),
          guest: form.get('guest') === 'yes' ? contact('guest') : null,
          pickup: attending === 'no' ? 'dispatch' : form.get('pickup'),
        })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const person = issue?.path[0] === 'awardee' ? 'Your details' : issue?.path[0] === 'guest' ? 'Guest details' : null
      setError([person, issue?.message ?? 'Check your details.'].filter(Boolean).join(' · '))
      return
    }
    setSaving(true)
    try {
      const result = await festivalRequest<{ response: FestivalResponse }>(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatch ? { dispatch: parsed.data } : { rsvp: parsed.data }),
      })
      setResponse(result.response)
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your response could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const quoteDraft = followUp?.draft
  const dispatchDefaults: Partial<FestivalDispatch> = quoteDraft ? {
    recipient: response?.dispatch?.recipient ?? response?.awardee?.name ?? member.name,
    phone: response?.dispatch?.phone ?? response?.awardee?.phone,
    country: quoteDraft.country,
    city: quoteDraft.city,
    region: quoteDraft.state,
    address: [quoteDraft.addressLine1, quoteDraft.addressLine2].filter(Boolean).join(', '),
    postalCode: quoteDraft.postalCode,
  } : response?.dispatch ?? { recipient: response?.awardee?.name ?? member.name, phone: response?.awardee?.phone }

  return (
    <RouteSection
      eyebrow="Africa Future Leaders Festival 2026"
      title={dispatch ? followUp ? 'Dispatch request' : 'Award dispatch' : 'Festival RSVP'}
      description={dispatch ? undefined : `${FESTIVAL_DATE} · ${FESTIVAL_VENUE}. Let us know if you’re coming and how you’d like to receive your award.`}
    >
      {!eligible ? <p className="rounded-xl border bg-white p-5 text-sm">This form is available once your awardee membership is approved.</p>
      : loading ? <p role="status">Loading your response…</p>
      : loadFailed ? <p role="alert">Your response could not be loaded. <button type="button" className="underline" onClick={() => window.location.reload()}>Try again</button></p>
      : dispatch && !followUp ? (
        <>
          {response?.dispatch && (
            <Button type="button" variant="outline" onClick={() => setFollowUp({ draft: null, hasEstimate: false })}>Review your saved dispatch request</Button>
          )}
          <DeliveryCostChecker
            title="Get a delivery quote"
            description="Check the GIG price for your destination. Delivery is paid separately from your award fee."
            renderQuoteNextStep={(draft, quote) => {
              if (quote && !quote.international) {
                return (
                  <div className="space-y-1.5">
                    <Link href="/dashboard/me/award/delivery" className="font-medium underline underline-offset-4">Continue to award delivery</Link>
                    <p className="text-xs leading-5 text-emerald-950">You can arrange delivery once your award payment is confirmed.</p>
                  </div>
                )
              }
              return (
                <Button type="button" variant="outline" className="min-h-11 whitespace-normal" onClick={() => { setSaved(false); setError(''); setFollowUp({ draft, hasEstimate: !!quote }) }}>
                  {quote ? 'Request international dispatch' : 'Request a manual quote'}
                </Button>
              )
            }}
          />
        </>
      ) : (
        <form ref={dispatch ? dispatchForm : undefined} tabIndex={dispatch ? -1 : undefined} onSubmit={submit} onChange={() => { setSaved(false); setError('') }} className={dispatch ? 'max-w-xl space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7' : 'max-w-2xl space-y-4'}>
          {dispatch && followUp && (
            <div className="space-y-2">
              <Button type="button" variant="ghost" onClick={() => { setError(''); setSaved(false); setFollowUp(null) }}>Back to delivery quotes</Button>
              <p className="text-sm text-neutral-700">{followUp.hasEstimate
                ? 'Save your contact and address so the team can confirm your international shipping arrangements.'
                : 'Submit your delivery details for the team to review and confirm a quote before you pay for shipping.'}</p>
            </div>
          )}
          <fieldset disabled={saving} className="space-y-5">
            {dispatch ? (
              dispatchFields.map(({ key, label, required, autoComplete, type }) => (
                <label key={key} className={fieldClass}>
                  <span>{label}</span>
                  <Input name={key} type={type} required={required} autoComplete={autoComplete}
                    defaultValue={dispatchDefaults[key]}
                    placeholder={key === 'phone' ? '+2348031234567' : undefined} />
                </label>
              ))
            ) : <FestivalRsvpFields response={response} profile={{ name: member.name, email: member.email }} />}
          </fieldset>
          <div className={dispatch ? 'space-y-3' : 'space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6'}>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {saved && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-900">{dispatch ? 'Dispatch request saved. The team will review your delivery details.' : 'Your RSVP is saved.'}</p>}
            <Button type="submit" disabled={saving} className="min-h-11 w-full rounded-lg bg-[#f6cf36] px-5 text-neutral-950 hover:bg-[#e9bf23] sm:w-auto">{saving ? 'Saving…' : dispatch ? 'Save dispatch request' : 'Save RSVP'}</Button>
            {saved && !dispatch && response?.pickup === 'dispatch' && <Link className="block text-sm font-medium underline underline-offset-4" href={dispatchHref}>Get a delivery quote</Link>}
            {!dispatch && <p className="text-sm text-neutral-600">You can save your RSVP before paying. Festival tickets require confirmed award payment.</p>}
          </div>
        </form>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium">
        <Link className="underline underline-offset-4" href={dispatch ? rsvpHref : dispatchHref}>{dispatch ? 'Update festival RSVP' : 'Get a delivery quote'}</Link>
        <Link className="underline underline-offset-4" href="/dashboard/festival">Festival tickets</Link>
      </div>
    </RouteSection>
  )
}
