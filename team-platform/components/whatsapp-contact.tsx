'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flag, Loader2, Undo2 } from 'lucide-react'
import { TrackedContactButton } from '@/components/tracked-contact-button'
import { normalizePhone } from '@/lib/phone'
import type { WhatsAppUnavailableReport } from '@/lib/whatsapp-availability'

type Props = {
  awardeeId: string
  awardeeName: string
  phone: string | null
  country?: string | null
  report: WhatsAppUnavailableReport | null
  message?: string
  iconOnly?: boolean
  className?: string
}

export function WhatsAppContact(props: Props) {
  return <ContactControl key={`${props.awardeeId}:${props.phone}:${props.report?.reportedAt || ''}`} {...props} />
}

function ContactControl({ awardeeId, awardeeName, phone, country, report, message, iconOnly, className }: Props) {
  const router = useRouter()
  const normalized = normalizePhone(phone, country || 'Nigeria')
  const [unavailable, setUnavailable] = useState(!!report)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)

  async function save(next: boolean) {
    if (inFlight.current || !normalized.ok) return
    inFlight.current = true
    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/whatsapp-availability', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId, expectedPhone: normalized.e164, unavailable: next }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Could not save the WhatsApp report')
      setUnavailable(next)
      router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the WhatsApp report') }
    finally { inFlight.current = false; setSaving(false) }
  }

  return <div className={`min-w-0 space-y-1.5 ${unavailable ? 'max-w-[230px]' : 'max-w-full'}`}>
    {unavailable ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2" role="status">
      <p className="text-xs font-medium text-amber-900">Not on WhatsApp — rep reported</p>
      <p className="mt-1 text-[11px] leading-4 text-amber-900">Use Call or Email instead.</p>
      <button type="button" disabled={saving} onClick={() => void save(false)} className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs text-amber-900 underline disabled:opacity-50" aria-label={`Undo WhatsApp report for ${awardeeName}`}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}Undo flag
      </button>
    </div> : <>
      <TrackedContactButton awardeeId={awardeeId} awardeeName={awardeeName} channel="whatsapp" message={message} hasPhone={normalized.ok} iconOnly={iconOnly} className={className} disabled={saving} />
      <button type="button" disabled={saving || !normalized.ok} onClick={() => void save(true)} className="inline-flex min-h-11 items-center gap-1 text-[11px] leading-4 text-muted underline underline-offset-2 disabled:opacity-50" aria-label={`Mark ${awardeeName} as not on WhatsApp`}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}Not on WhatsApp?
      </button>
    </>}
    {error ? <p role="alert" className="max-w-[230px] text-xs leading-5 text-red-700">{error}</p> : null}
    {unavailable && !iconOnly ? <p className="text-[11px] leading-4 text-muted">This report does not verify contact or earn commission.</p> : null}
  </div>
}
