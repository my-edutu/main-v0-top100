'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'

export function ReassignPanel({
  awardeeId,
  currentAgentId,
  agents,
}: {
  awardeeId: string
  currentAgentId: string | null
  agents: Array<{ id: string; full_name: string; email: string; workload: number }>
}) {
  const router = useRouter()
  const [agentId, setAgentId] = useState(currentAgentId ?? agents[0]?.id ?? '')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const response = await fetch('/api/admin/awardees/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId, agentId, reason }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not reassign awardee')
      setSuccess('Assignment updated. Both agents were notified; the history is preserved.')
      setReason('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reassign awardee')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}
      <Field label="Assign to">
        <select className="select !h-10" value={agentId} onChange={(event) => setAgentId(event.target.value)} required>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id} disabled={agent.workload >= 100 && agent.id !== currentAgentId}>
              {agent.full_name} · {agent.workload}/100 active{agent.workload >= 100 && agent.id !== currentAgentId ? ' · full' : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Reason">
        <input
          className="input !h-10"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. Agent on leave"
          minLength={3}
          maxLength={500}
          required
        />
      </Field>
      <Button type="submit" variant="ghost" className="w-full" disabled={loading || !agentId}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
        Reassign awardee
      </Button>
    </form>
  )
}
