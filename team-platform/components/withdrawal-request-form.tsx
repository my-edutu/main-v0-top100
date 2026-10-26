'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Wallet } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'
import { formatMinor } from '@/lib/format'
import type { Balance } from '@/lib/types'

type Method = 'bank_transfer' | 'paystack' | 'other'

export function WithdrawalRequestForm({
  balances,
  minMinor,
  maxMinor,
}: {
  balances: Balance[]
  minMinor: number
  maxMinor: number
}) {
  const router = useRouter()
  const availableCurrencies = balances.filter((balance) => balance.withdrawable_minor > 0)
  const [currency, setCurrency] = useState(availableCurrencies[0]?.currency ?? balances[0]?.currency ?? 'NGN')
  const balance = useMemo(
    () => balances.find((row) => row.currency === currency) ?? balances[0],
    [balances, currency],
  )
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Method>('bank_transfer')
  const [bankName, setBankName] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [paystackEmail, setPaystackEmail] = useState('')
  const [note, setNote] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const minor = Math.round(Number(amount || 0) * 100)
  const canSubmit = minor > 0 && minor <= (balance?.withdrawable_minor ?? 0) && !loading

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const payoutDetails =
        method === 'bank_transfer'
          ? { bankName, accountName, accountNumber }
          : method === 'paystack'
            ? { accountEmail: paystackEmail }
            : { note }
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountMinor: minor,
          currency,
          payoutMethod: method,
          payoutDetails,
          idempotencyKey,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not request a withdrawal')
      setSuccess('Withdrawal request submitted for administrator review.')
      setAmount('')
      setIdempotencyKey(crypto.randomUUID())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request a withdrawal')
    } finally {
      setLoading(false)
    }
  }

  if (!balance || balance.withdrawable_minor <= 0) {
    return (
      <Banner tone="info">
        You have no confirmed commission available to withdraw yet. Pending commissions become available when
        the hold period ends.
      </Banner>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}

      <div className="rounded-xl bg-moss-soft px-3.5 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-moss/80">Withdrawable</p>
        <p className="num mt-0.5 text-xl font-semibold text-moss">
          {formatMinor(balance.withdrawable_minor, balance.currency)}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-moss/75">
          Available balance is recalculated on the server when you submit. Pending requests reserve part of it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Currency">
          <select className="select" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {balances.map((row) => (
              <option key={row.currency} value={row.currency}>
                {row.currency}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount" hint={minMinor > 0 ? `Minimum ${formatMinor(minMinor, currency)}` : undefined}>
          <input
            className="input"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            required
          />
        </Field>
      </div>
      {maxMinor > 0 ? (
        <p className="-mt-1.5 text-[10px] text-muted">Maximum per request: {formatMinor(maxMinor, currency)}</p>
      ) : null}

      <Field label="Payout method">
        <select className="select" value={method} onChange={(event) => setMethod(event.target.value as Method)}>
          <option value="bank_transfer">Bank transfer</option>
          <option value="paystack">Paystack transfer</option>
          <option value="other">Other (explain below)</option>
        </select>
      </Field>

      {method === 'bank_transfer' ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Bank">
            <input className="input" value={bankName} onChange={(event) => setBankName(event.target.value)} required maxLength={300} />
          </Field>
          <Field label="Account name">
            <input className="input" value={accountName} onChange={(event) => setAccountName(event.target.value)} required maxLength={300} />
          </Field>
          <Field label="Account number">
            <input className="input" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} required maxLength={300} />
          </Field>
        </div>
      ) : method === 'paystack' ? (
        <Field label="Paystack account email">
          <input className="input" type="email" value={paystackEmail} onChange={(event) => setPaystackEmail(event.target.value)} required maxLength={300} />
        </Field>
      ) : (
        <Field label="Payout instructions">
          <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} required maxLength={300} />
        </Field>
      )}

      <p className="text-[10px] leading-4 text-muted">
        A request reserves the amount immediately. An administrator reviews and pays it manually; marking a request
        paid requires a real transaction reference. {minor > (balance.withdrawable_minor ?? 0) ? 'The amount exceeds your available balance.' : ''}
      </p>
      <Button type="submit" variant="ember" className="w-full" disabled={!canSubmit}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        {loading ? 'Submitting…' : 'Request withdrawal'}
      </Button>
    </form>
  )
}
