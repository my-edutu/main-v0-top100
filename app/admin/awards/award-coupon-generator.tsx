'use client'

import { useRef, useState, type FormEvent } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const expiryDisplay = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Africa/Lagos',
})

export function AwardCouponGenerator() {
  const [expiry, setExpiry] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; expiresAt: string } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const submitting = useRef(false)

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setPending(true)
    setError('')
    setCopyStatus('')
    try {
      const response = await fetch('/api/admin/awards/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: expiry }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || typeof data?.code !== 'string' || typeof data?.expiresAt !== 'string') {
        throw new Error(data?.message || 'Could not generate a coupon. Please try again.')
      }
      setCoupon({ code: data.code, expiresAt: data.expiresAt })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not generate a coupon.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      setCopyStatus('Coupon code copied.')
    } catch {
      setCopyStatus('Select the code above to copy it manually.')
    }
  }

  return (
    <section aria-labelledby="award-coupon-heading" className="admin-panel space-y-4 p-4 sm:p-5">
      <div>
        <h2 id="award-coupon-heading" className="text-lg font-semibold">Award coupons</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Give signed-in awardees ₦5,000 off an unpaid award. Coupon payments are excluded from sales and commission.
        </p>
      </div>
      <form onSubmit={generate} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1.5 sm:flex-none">
          <label htmlFor="award-coupon-expiry" className="text-sm font-medium">Expires at (Lagos time)</label>
          <Input
            id="award-coupon-expiry"
            type="datetime-local"
            required
            value={expiry}
            onChange={event => setExpiry(event.target.value)}
            disabled={pending}
            className="min-h-11"
          />
        </div>
        <Button type="submit" disabled={pending || !expiry} className="min-h-11">
          {pending ? 'Generating…' : 'Generate coupon'}
        </Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {coupon && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
          <div className="min-w-0 flex-1 space-y-1" role="status">
            <code className="select-all break-all text-sm font-semibold">{coupon.code}</code>
            <p className="text-sm text-muted-foreground">
              Active until {expiryDisplay.format(new Date(coupon.expiresAt))} WAT. Copy the code before leaving this page.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void copyCode(coupon.code)} className="min-h-11">
            <Copy aria-hidden="true" /> Copy code
          </Button>
        </div>
      )}
      {copyStatus && <p role="status" className="text-sm text-muted-foreground">{copyStatus}</p>}
    </section>
  )
}
