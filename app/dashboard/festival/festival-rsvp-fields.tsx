'use client'

import { useState, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import type { FestivalContact, FestivalResponse } from '@/lib/festival/interest'

const panelClass = 'min-w-0 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6'
const labelClass = 'grid min-w-0 gap-1.5 text-sm font-medium text-neutral-800'
const inputClass = 'h-11 rounded-lg border-neutral-300 bg-white text-base'

function Choice({ group, value, selected, onSelect, children }: {
  group: string
  value: string
  selected: boolean
  onSelect: () => void
  children: ReactNode
}) {
  return (
    <label className="flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-xl border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-900 has-checked:border-amber-600 has-checked:bg-amber-50">
      <input type="radio" name={group} value={value} required checked={selected} onChange={onSelect} className="size-4 shrink-0 accent-neutral-900" />
      <span>{children}</span>
    </label>
  )
}

function ContactFields({ person, contact }: { person: 'awardee' | 'guest'; contact: Partial<FestivalContact> }) {
  const possessive = person === 'awardee' ? 'Your' : 'Guest’s'
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <label className={`${labelClass} sm:col-span-2`}>
        <span>{possessive} full name</span>
        <Input name={`${person}-name`} defaultValue={contact.name} maxLength={150} autoComplete={`section-${person} name`} required className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>{possessive} email address</span>
        <Input name={`${person}-email`} type="email" defaultValue={contact.email} maxLength={254} autoComplete={`section-${person} email`} required className={inputClass} />
      </label>
      <label className={labelClass}>
        <span>{possessive} phone number</span>
        <Input name={`${person}-phone`} type="tel" defaultValue={contact.phone} maxLength={40} autoComplete={`section-${person} tel`} placeholder="+234 803 123 4567" required className={inputClass} />
        <span className="text-xs font-normal text-neutral-600">Include the country code.</span>
      </label>
    </div>
  )
}

export function FestivalRsvpFields({ response, profile }: {
  response: FestivalResponse | null
  profile: Pick<FestivalContact, 'name' | 'email'>
}) {
  const [attendance, setAttendance] = useState(response?.attending == null ? '' : response.attending ? 'yes' : 'no')
  const [guest, setGuest] = useState(response?.guest ? 'yes' : response?.awardee && response.attending ? 'no' : '')
  const [pickup, setPickup] = useState<string>(response?.pickup ?? '')

  return (
    <>
      <section aria-labelledby="rsvp-awardee" className={panelClass}>
        <h2 id="rsvp-awardee" className="text-lg font-semibold tracking-tight text-neutral-950">Your awardee details</h2>
        <ContactFields person="awardee" contact={response?.awardee ?? profile} />
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-neutral-900">Will you attend the festival?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Choice group="attending" value="yes" selected={attendance === 'yes'} onSelect={() => setAttendance('yes')}>Yes, I’ll attend</Choice>
            <Choice group="attending" value="no" selected={attendance === 'no'} onSelect={() => setAttendance('no')}>No, I can’t attend</Choice>
          </div>
        </fieldset>
      </section>

      {attendance === 'yes' && (
        <section aria-labelledby="rsvp-guest" className={panelClass}>
          <h2 id="rsvp-guest" className="text-lg font-semibold tracking-tight text-neutral-950">Your guest</h2>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-neutral-900">Are you bringing a guest?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Choice group="guest" value="no" selected={guest === 'no'} onSelect={() => setGuest('no')}>No, just me</Choice>
              <Choice group="guest" value="yes" selected={guest === 'yes'} onSelect={() => setGuest('yes')}>Yes, one guest</Choice>
            </div>
          </fieldset>
          {guest === 'yes' && <ContactFields person="guest" contact={response?.guest ?? {}} />}
        </section>
      )}

      {attendance && (
        <section aria-labelledby="rsvp-award" className={panelClass}>
          <h2 id="rsvp-award" className="text-lg font-semibold tracking-tight text-neutral-950">Receiving your award</h2>
          {attendance === 'yes' ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-neutral-900">How would you like to receive it?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Choice group="pickup" value="festival" selected={pickup === 'festival'} onSelect={() => setPickup('festival')}>Collect at the festival</Choice>
                <Choice group="pickup" value="dispatch" selected={pickup === 'dispatch'} onSelect={() => setPickup('dispatch')}>Dispatch to my address</Choice>
              </div>
            </fieldset>
          ) : <p className="text-sm text-neutral-700">Your award preference will be saved as dispatch. You can enter your shipping address separately.</p>}
        </section>
      )}
    </>
  )
}
