'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'

type Settings = {
  assignment_strategy: 'least_loaded' | 'round_robin'
  auto_assign_enabled: boolean
  default_country: string
  withdrawal_min_minor: number
  withdrawal_max_minor: number
  commission_hold_hours: number
  sender_name: string
  sender_email: string | null
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter()
  const [strategy, setStrategy] = useState(settings.assignment_strategy)
  const [autoAssign, setAutoAssign] = useState(settings.auto_assign_enabled)
  const [country, setCountry] = useState(settings.default_country)
  const [min, setMin] = useState((settings.withdrawal_min_minor / 100).toFixed(2))
  const [max, setMax] = useState((settings.withdrawal_max_minor / 100).toFixed(2))
  const [hold, setHold] = useState(String(settings.commission_hold_hours))
  const [senderName, setSenderName] = useState(settings.sender_name)
  const [senderEmail, setSenderEmail] = useState(settings.sender_email ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentStrategy: strategy,
          autoAssignEnabled: autoAssign,
          defaultCountry: country,
          withdrawalMinMinor: Math.round(Number(min || 0) * 100),
          withdrawalMaxMinor: Math.round(Number(max || 0) * 100),
          commissionHoldHours: Number(hold || 0),
          senderName,
          senderEmail,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not save settings')
      setSuccess('Settings saved.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Assignment strategy" hint="Least-loaded spreads work evenly. Round-robin also rotates by last assignment.">
          <select className="select" value={strategy} onChange={(event) => setStrategy(event.target.value as Settings['assignment_strategy'])}>
            <option value="least_loaded">Least loaded</option>
            <option value="round_robin">Round robin</option>
          </select>
        </Field>
        <Field label="Default country" hint="Used for phone normalization and assignment filters.">
          <input className="input" value={country} onChange={(event) => setCountry(event.target.value)} required minLength={2} maxLength={80} />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-cream/60 p-3.5">
        <input
          type="checkbox"
          checked={autoAssign}
          onChange={(event) => setAutoAssign(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#DE4B1F]"
        />
        <span>
          <span className="block text-xs font-semibold">Allow automatic assignment runs</span>
          <span className="mt-0.5 block text-[11px] leading-5 text-muted">
            Pausing stops administrators from distributing unassigned awardees. Existing assignments are never changed
            by an assignment run.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Minimum withdrawal" hint="0 means no minimum. Amounts are in the currency shown.">
          <input className="input" inputMode="decimal" value={min} onChange={(event) => setMin(event.target.value)} />
        </Field>
        <Field label="Maximum withdrawal" hint="0 means no administrator-configured maximum.">
          <input className="input" inputMode="decimal" value={max} onChange={(event) => setMax(event.target.value)} />
        </Field>
        <Field label="Commission hold (hours)" hint="0 makes a verified commission available immediately.">
          <input className="input" type="number" min={0} max={2160} value={hold} onChange={(event) => setHold(event.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email sender name">
          <input className="input" value={senderName} onChange={(event) => setSenderName(event.target.value)} required minLength={2} maxLength={120} />
        </Field>
        <Field label="Email sender address" hint="Leave blank to use SMTP_FROM_EMAIL.">
          <input className="input" type="email" value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} />
        </Field>
      </div>

      <Button type="submit" variant="ember" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save settings
      </Button>
    </form>
  )
}
