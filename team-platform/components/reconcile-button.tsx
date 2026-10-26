'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { Banner, Button } from '@/components/ui'

type Result = {
  scanned: number
  commissions_created: number
  already_reconciled: number
  paid_without_rule: number
  paid_without_assignment: number
}

export function ReconcileButton({ missing }: { missing: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const response = await fetch('/api/admin/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 500 }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not reconcile payments')
      setResult(payload.result)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reconcile payments')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {result ? (
        <Banner tone="success">
          Scanned {result.scanned} verified orders · {result.commissions_created} commissions created ·{' '}
          {result.already_reconciled} already reconciled
          {result.paid_without_assignment ? ` · ${result.paid_without_assignment} paid but unassigned` : ''}
          {result.paid_without_rule ? ` · ${result.paid_without_rule} without a commission rule` : ''}.
        </Banner>
      ) : null}
      <Button variant="ember" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {loading ? 'Reconciling…' : missing ? `Reconcile ${missing} missing` : 'Run reconciliation'}
      </Button>
    </div>
  )
}
