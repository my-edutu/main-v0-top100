'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Shuffle } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'

type Result = {
  assigned: number
  skipped: number
  capacity_skipped?: number
  limit_per_agent?: number
  country: string | null
  agent_counts: Record<string, number>
}

export function AssignmentRunner({
  defaultCountry,
  autoEnabled,
  unassigned,
  activeAgents,
  countries,
}: {
  defaultCountry: string
  autoEnabled: boolean
  unassigned: number
  activeAgents: number
  countries: string[]
}) {
  const router = useRouter()
  const [limit, setLimit] = useState(String(Math.min(Math.max(unassigned, 1), 1000)))
  const [country, setCountry] = useState(defaultCountry)
  const [includePending, setIncludePending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function run(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/admin/assignments/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          limit: Number(limit || 0),
          country: country.trim(),
          includePending,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not run assignment')
      setResult(payload.result)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run assignment')
    } finally {
      setLoading(false)
    }
  }

  if (!autoEnabled) {
    return (
      <Banner tone="warning">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Automatic assignment is paused. <Link href="/admin/settings" className="font-semibold underline">Enable it in Settings</Link>{' '}
            before distributing awardees.
          </span>
        </span>
      </Banner>
    )
  }

  if (!activeAgents) {
    return (
      <Banner tone="warning">
        There are no active sales agents. Invite and activate agents before running assignment.
      </Banner>
    )
  }

  return (
    <form onSubmit={run} className="space-y-3.5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {result ? (
        <Banner tone={result.assigned ? 'success' : 'info'}>
          {result.assigned} awardee{result.assigned === 1 ? '' : 's'} assigned
          {result.skipped ? ` · ${result.skipped} skipped` : ''}. Existing assignments were left untouched.
          {result.capacity_skipped ? ` ${result.capacity_skipped} skipped because the 100-awardee limit is full.` : ''}
        </Banner>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Batch size" hint={`${unassigned.toLocaleString()} unassigned available.`}>
          <input className="input !h-10" type="number" min={1} max={5000} value={limit} onChange={(event) => setLimit(event.target.value)} required />
        </Field>
        <Field label="Country" hint="Choose a country or distribute across all; Nigeria is prioritized.">
          <select className="select !h-10" value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="">All countries · Nigeria first</option>
            <option value="Nigeria">Nigeria only</option>
            {countries.filter((item) => item.toLowerCase() !== 'nigeria').map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[11px]">
        <input type="checkbox" checked={includePending} onChange={(event) => setIncludePending(event.target.checked)} className="h-4 w-4 accent-[#DE4B1F]" />
        Include awardees whose payment is pending verification
      </label>
      <Button type="submit" variant="ember" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
        {loading ? 'Assigning…' : 'Run fair assignment'}
      </Button>
      <p className="text-[10px] leading-4 text-muted">
        Paid and refunded awardees are never distributed. The run is serialized per team, so two administrators
        cannot double-assign the same awardee.
      </p>
    </form>
  )
}
