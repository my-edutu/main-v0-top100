'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { formatMinor } from '@/lib/format'

type Action = 'review' | 'approve' | 'reject' | 'process' | 'pay' | 'cancel'

function actionsFor(status: string): Array<{ action: Action; label: string; variant?: 'primary' | 'ghost' | 'danger' }> {
  switch (status) {
    case 'requested':
      return [
        { action: 'review', label: 'Review', variant: 'ghost' },
        { action: 'approve', label: 'Approve' },
        { action: 'reject', label: 'Reject', variant: 'danger' },
      ]
    case 'under_review':
      return [
        { action: 'approve', label: 'Approve' },
        { action: 'reject', label: 'Reject', variant: 'danger' },
      ]
    case 'approved':
      return [
        { action: 'process', label: 'Processing', variant: 'ghost' },
        { action: 'pay', label: 'Mark paid' },
        { action: 'reject', label: 'Reject', variant: 'danger' },
      ]
    case 'processing':
      return [{ action: 'pay', label: 'Mark paid' }]
    default:
      return []
  }
}

export function WithdrawalActions({
  id,
  status,
  amountMinor,
  currency,
}: {
  id: string
  status: string
  amountMinor: number
  currency: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<Action | null>(null)
  const [paying, setPaying] = useState(false)
  const [reference, setReference] = useState('')
  const [paidAmount, setPaidAmount] = useState((amountMinor / 100).toFixed(2))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const actions = actionsFor(status)
  if (!actions.length && !paying) {
    return <span className="text-[11px] text-muted">No action</span>
  }

  async function run(action: Action, extra: Record<string, unknown> = {}) {
    if (action === 'reject' && !window.confirm('Reject this withdrawal request?')) return
    setLoading(action)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/withdrawals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note, ...extra }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not update the withdrawal')
      setSuccess('Withdrawal updated.')
      setPaying(false)
      setNote('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the withdrawal')
    } finally {
      setLoading(null)
    }
  }

  if (paying) {
    return (
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault()
          const minor = Math.round(Number(paidAmount || 0) * 100)
          if (!reference.trim() || minor <= 0) {
            setError('A transaction reference and positive amount are required')
            return
          }
          run('pay', { reference: reference.trim(), paidAmountMinor: minor })
        }}
      >
        {error ? <p className="text-[10px] text-red-700">{error}</p> : null}
        <input
          className="input !h-8 text-xs"
          placeholder="Bank/payout transaction reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          required
        />
        <input
          className="input !h-8 text-xs"
          placeholder={`Paid amount (${currency})`}
          inputMode="decimal"
          value={paidAmount}
          onChange={(event) => setPaidAmount(event.target.value)}
          required
        />
        <input
          className="input !h-8 text-xs"
          placeholder="Optional note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="flex gap-1.5">
          <Button type="submit" size="sm" disabled={loading === 'pay'}>
            {loading === 'pay' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Confirm {formatMinor(Math.round(Number(paidAmount || 0) * 100), currency)}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setPaying(false)}>
            <X className="h-3 w-3" /> Cancel
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-1.5">
      {error ? <p className="text-[10px] text-red-700">{error}</p> : null}
      {success ? <p className="text-[10px] text-moss">{success}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {actions.map((action) => (
          <Button
            key={action.action}
            size="sm"
            variant={action.variant ?? 'primary'}
            disabled={Boolean(loading)}
            onClick={() => {
              if (action.action === 'pay') {
                setPaying(true)
                setError(null)
                setSuccess(null)
                return
              }
              if (action.action === 'reject' || action.action === 'approve') {
                const noteValue = window.prompt(`${action.label} — optional note for the agent:`) ?? ''
                run(action.action, { note: noteValue })
                return
              }
              run(action.action)
            }}
          >
            {loading === action.action ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {action.label}
          </Button>
        ))}
        {status === 'requested' || status === 'under_review' ? (
          <Button size="sm" variant="ghost" disabled={Boolean(loading)} onClick={() => run('cancel')}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}
