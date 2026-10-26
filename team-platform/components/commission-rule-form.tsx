'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'

type Rule = {
  id: string
  name: string
  payment_currency: 'NGN' | 'USD'
  commission_currency: 'NGN' | 'USD'
  commission_amount_minor: number
  country_scope: string | null
  priority: number
  is_active: boolean
}

export function CommissionRuleForm({ rule }: { rule?: Rule }) {
  const router = useRouter()
  const [name, setName] = useState(rule?.name ?? '')
  const [paymentCurrency, setPaymentCurrency] = useState(rule?.payment_currency ?? 'NGN')
  const [commissionCurrency, setCommissionCurrency] = useState(rule?.commission_currency ?? 'NGN')
  const [amount, setAmount] = useState(rule ? (rule.commission_amount_minor / 100).toFixed(2) : '2000.00')
  const [countryScope, setCountryScope] = useState(rule?.country_scope ?? '')
  const [priority, setPriority] = useState(String(rule?.priority ?? 0))
  const [active, setActive] = useState(rule?.is_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/admin/commission-rules', {
        method: rule ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(rule ? { id: rule.id } : {}),
          name,
          paymentCurrency,
          commissionCurrency,
          commissionAmountMinor: Math.round(Number(amount || 0) * 100),
          countryScope: countryScope.trim() || null,
          priority: Number(priority || 0),
          isActive: active,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not save the commission rule')
      setSuccess('Commission rule saved.')
      if (!rule) {
        setName('')
        setCountryScope('')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the commission rule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}
      <Field label="Rule name">
        <input className="input !h-10" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Payment currency">
          <select className="select !h-10" value={paymentCurrency} onChange={(event) => setPaymentCurrency(event.target.value as 'NGN' | 'USD')}>
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
          </select>
        </Field>
        <Field label="Commission currency">
          <select className="select !h-10" value={commissionCurrency} onChange={(event) => setCommissionCurrency(event.target.value as 'NGN' | 'USD')}>
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={`Commission amount (${commissionCurrency})`}>
          <input className="input !h-10" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} required />
        </Field>
        <Field label="Country scope" hint="Blank applies to every country.">
          <input className="input !h-10" value={countryScope} onChange={(event) => setCountryScope(event.target.value)} maxLength={80} placeholder="e.g. Nigeria" />
        </Field>
      </div>
      <div className="grid grid-cols-2 items-end gap-2">
        <Field label="Priority" hint="Higher wins when several rules match.">
          <input className="input !h-10" type="number" min={0} max={1000} value={priority} onChange={(event) => setPriority(event.target.value)} />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-[11px]">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-[#DE4B1F]" />
          Active
        </label>
      </div>
      <Button type="submit" variant={rule ? 'ghost' : 'ember'} size={rule ? 'sm' : 'md'} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {rule ? 'Save rule' : 'Add commission rule'}
      </Button>
    </form>
  )
}
