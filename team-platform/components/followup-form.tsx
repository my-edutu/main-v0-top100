'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PhoneCall, Save } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'
import { CHANNELS, OUTCOMES } from '@/lib/validation'
import { CHANNEL_LABELS, OUTCOME_LABELS } from '@/lib/format'

export function FollowUpForm({
  awardeeId,
  defaultChannel = 'call',
  disabled = false,
}: {
  awardeeId: string
  defaultChannel?: string
  disabled?: boolean
}) {
  const router = useRouter()
  const [channel, setChannel] = useState(
    (CHANNELS as readonly string[]).includes(defaultChannel) ? defaultChannel : 'call',
  )
  const [outcome, setOutcome] = useState('no_answer')
  const [notes, setNotes] = useState('')
  const [responded, setResponded] = useState(false)
  const [paymentExpected, setPaymentExpected] = useState(false)
  const [nextFollowupAt, setNextFollowupAt] = useState('')
  const [contactedAt, setContactedAt] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const outcomes = useMemo(() => OUTCOMES, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const response = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awardeeId,
          channel,
          outcome,
          notes,
          responded,
          paymentExpected,
          contactedAt: contactedAt ? new Date(contactedAt).toISOString() : undefined,
          nextFollowupAt: nextFollowupAt || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not record follow-up')
      setSuccess('Follow-up recorded on the awardee timeline.')
      setNotes('')
      setPaymentExpected(false)
      setResponded(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record follow-up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" id="record">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}
      <div className="grid grid-cols-3 gap-1.5">
        {CHANNELS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setChannel(item)}
            className={`rounded-xl border px-2 py-2 text-[11px] font-semibold transition ${
              channel === item
                ? 'border-ink bg-ink text-cream'
                : 'border-ink/10 bg-white/70 text-muted hover:border-ink/25'
            }`}
            aria-pressed={channel === item}
          >
            {CHANNEL_LABELS[item]}
          </button>
        ))}
      </div>
      <Field label="Contact outcome">
        <select className="select !h-10" value={outcome} onChange={(event) => setOutcome(event.target.value)}>
          {outcomes.map((item) => (
            <option key={item} value={item}>
              {OUTCOME_LABELS[item]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Notes" hint="What was discussed? Keep it factual and useful for the next call.">
        <textarea
          className="textarea min-h-[82px]"
          maxLength={4000}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Asked for the payment link to be resent on WhatsApp. Will confirm by Friday."
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Contacted at">
          <input
            className="input !h-10"
            type="datetime-local"
            value={contactedAt}
            onChange={(event) => setContactedAt(event.target.value)}
            required
          />
        </Field>
        <Field label="Next follow-up">
          <input
            className="input !h-10"
            type="date"
            value={nextFollowupAt}
            onChange={(event) => setNextFollowupAt(event.target.value)}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-[11px]">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={responded}
            onChange={(event) => setResponded(event.target.checked)}
            className="h-3.5 w-3.5 accent-[#DE4B1F]"
          />
          Awardee responded
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={paymentExpected}
            onChange={(event) => setPaymentExpected(event.target.checked)}
            className="h-3.5 w-3.5 accent-[#DE4B1F]"
          />
          Payment expected
        </label>
      </div>
      <Button type="submit" variant="ember" className="w-full" disabled={disabled || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {loading ? 'Recording…' : 'Record follow-up'}
      </Button>
      <p className="flex items-start gap-1.5 text-[10px] leading-4 text-muted">
        <PhoneCall className="mt-0.5 h-3 w-3 shrink-0" />
        Opening a dialler or WhatsApp does not count as contact. Record the real outcome here.
      </p>
    </form>
  )
}
