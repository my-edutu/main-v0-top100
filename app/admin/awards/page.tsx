'use client'

// app/admin/awards/page.tsx
// Admin console for Africa Future Leaders award orders: every order, its
// status, its money, and the manual overrides the team needs when an
// automated quote or dispatch fails.
//
// Note on the paid-without-waybill queue: if the courier booking fails, or
// the process dies between marking an order `paid` and recording a waybill,
// the order is stuck at `status = 'paid'` with `gig_waybill` null. The
// Paystack webhook never retries this on its own — a later redelivery of the
// same event sees the order already paid and returns immediately. This page
// is therefore the only place such an order is ever discovered and shipped,
// so that queue is surfaced unconditionally at the top of the page (not just
// as one filter option among many) whenever it is non-empty.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Award,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

// `lib/awards/money.ts` and `lib/awards/status.ts` are plain, dependency-free
// logic — safe to import client-side. `lib/awards/server.ts` is explicitly
// server-only ("Never import into a client component"), so its types are not
// imported here; the shape below is this page's own copy of what the GET
// route actually returns.
import { formatNaira, totalKobo } from '@/lib/awards/money'
import { canTransition, isPaid, type AwardStatus } from '@/lib/awards/status'

type AwardOrder = {
  id: string
  status: AwardStatus
  recipientName: string
  phone: string
  email: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  country: string
  postalCode: string
  awardAmountKobo: number
  shippingAmountKobo: number | null
  totalAmountKobo: number | null
  currency: string
  quoteExpiresAt: string | null
  waybill: string | null
  trackingUrl: string | null
  deliveryStatus: string | null
  paidAt: string | null
  createdAt: string
  memberName: string
  memberEmail: string
  adminNote: string | null
  paystackReference: string | null
}

const ALL_STATUSES: AwardStatus[] = [
  'draft',
  'quoted',
  'quote_failed',
  'awaiting_payment',
  'paid',
  'dispatched',
  'in_transit',
  'delivered',
  'cancelled',
]

// Manual one-click status advances offered as "quick actions" on each order.
// Deliberately excludes `paid`: the PATCH route only flips the `status`
// column and never sets `paid_at` / `paystack_reference`, so a one-click
// "mark paid" button would let an admin fabricate a paid order with no real
// Paystack charge behind it. `paid` may only ever be reached by the
// signature-verified webhook. Shipment-tracking states and cancellation carry
// no such risk, so they stay available here.
const MANUAL_ADVANCE_TARGETS: AwardStatus[] = ['in_transit', 'delivered', 'cancelled']

// A synthetic filter value layered on top of `AwardStatus` for the
// paid-but-undispatched recovery queue (Requirement A). It is not a real
// order status — it is `status === 'paid' && !waybill` — so it is kept out
// of `AwardStatus` itself and handled specially wherever it is used.
type StatusFilter = 'all' | AwardStatus | 'paid_no_waybill'

const STATUS_LABELS: Record<AwardStatus, string> = {
  draft: 'Draft',
  quoted: 'Quoted',
  quote_failed: 'Quote failed',
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  dispatched: 'Dispatched',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_BADGE_VARIANT: Record<AwardStatus, 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'soft' | 'outline'> = {
  draft: 'outline',
  quoted: 'info',
  quote_failed: 'destructive',
  awaiting_payment: 'warning',
  paid: 'success',
  dispatched: 'secondary',
  in_transit: 'secondary',
  delivered: 'success',
  cancelled: 'outline',
}

function isPaidWithoutWaybill(order: AwardOrder): boolean {
  return order.status === 'paid' && !order.waybill
}

/** Timestamps a note and appends it to any existing one, mirroring the
 * webhook's own `appendNote` so a manual note never erases an automated one. */
function appendAdminNote(existing: string | null, addition: string): string {
  const trimmedAddition = addition.trim()
  const prior = existing?.trim() ?? ''
  const stamped = `[${new Date().toISOString()}] ${trimmedAddition}`
  return prior ? `${prior}\n${stamped}` : stamped
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminAwardsPage() {
  const [orders, setOrders] = useState<AwardOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [savingId, setSavingId] = useState<string | null>(null)

  // Per-row draft inputs, keyed by order id.
  const [shippingDrafts, setShippingDrafts] = useState<Record<string, string>>({})
  const [waybillDrafts, setWaybillDrafts] = useState<Record<string, string>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setSetupMessage(null)
    try {
      const response = await fetch('/api/admin/awards')
      const data = await response.json().catch(() => ({}))

      if (response.status === 503) {
        setSetupMessage(data?.message || 'The awards database is not set up yet.')
        setOrders([])
        return
      }

      if (!response.ok) {
        setErrorMessage(data?.message || 'Failed to load award orders.')
        setOrders([])
        return
      }

      setOrders(data?.orders ?? [])
    } catch (error) {
      console.error('Error fetching award orders:', error)
      setErrorMessage('Failed to load award orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const paidWithoutWaybill = useMemo(() => orders.filter(isPaidWithoutWaybill), [orders])

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return orders
    if (statusFilter === 'paid_no_waybill') return paidWithoutWaybill
    return orders.filter((order) => order.status === statusFilter)
  }, [orders, statusFilter, paidWithoutWaybill])

  const stats = useMemo(
    () => ({
      total: orders.length,
      paidNoWaybill: paidWithoutWaybill.length,
      quoteFailed: orders.filter((order) => order.status === 'quote_failed').length,
      dispatchedOrLater: orders.filter((order) =>
        (['dispatched', 'in_transit', 'delivered'] as AwardStatus[]).includes(order.status),
      ).length,
    }),
    [orders, paidWithoutWaybill],
  )

  const patchOrder = useCallback(
    async (
      orderId: string,
      payload: Partial<{ status: AwardStatus; shippingAmountKobo: number; adminNote: string; waybill: string }>,
    ) => {
      setSavingId(orderId)
      try {
        const response = await fetch('/api/admin/awards', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, ...payload }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          toast.error(data?.message || 'Could not update this order.')
          return false
        }

        toast.success('Order updated.')
        await fetchOrders()
        return true
      } catch (error) {
        console.error('Error updating award order:', error)
        toast.error('Could not update this order.')
        return false
      } finally {
        setSavingId(null)
      }
    },
    [fetchOrders],
  )

  const handleSetShippingPrice = useCallback(
    async (order: AwardOrder) => {
      const raw = shippingDrafts[order.id] ?? ''
      const parsed = Number(raw)
      if (raw.trim() === '' || !Number.isInteger(parsed) || parsed < 0) {
        toast.error('Enter a whole number of kobo (e.g. 350000 for ₦3,500).')
        return
      }
      const ok = await patchOrder(order.id, { shippingAmountKobo: parsed })
      if (ok) setShippingDrafts((prev) => ({ ...prev, [order.id]: '' }))
    },
    [shippingDrafts, patchOrder],
  )

  const handleRecordWaybill = useCallback(
    async (order: AwardOrder) => {
      const waybill = (waybillDrafts[order.id] ?? '').trim()
      if (!waybill) {
        toast.error('Enter the courier waybill number.')
        return
      }
      // Mirrors what the automated path does on a successful booking: the
      // waybill and the move to `dispatched` land in the one PATCH call.
      const canDispatch = canTransition(order.status, 'dispatched')
      const ok = await patchOrder(order.id, {
        waybill,
        ...(canDispatch ? { status: 'dispatched' as AwardStatus } : {}),
      })
      if (ok) setWaybillDrafts((prev) => ({ ...prev, [order.id]: '' }))
    },
    [waybillDrafts, patchOrder],
  )

  const handleSaveNote = useCallback(
    async (order: AwardOrder) => {
      const addition = (noteDrafts[order.id] ?? '').trim()
      if (!addition) {
        toast.error('Write a note before saving.')
        return
      }
      const nextNote = appendAdminNote(order.adminNote, addition)
      const ok = await patchOrder(order.id, { adminNote: nextNote })
      if (ok) setNoteDrafts((prev) => ({ ...prev, [order.id]: '' }))
    },
    [noteDrafts, patchOrder],
  )

  const handleAdvanceStatus = useCallback(
    async (order: AwardOrder, next: AwardStatus) => {
      await patchOrder(order.id, { status: next })
    },
    [patchOrder],
  )

  // Fallback for when the webhook never arrives (most commonly a
  // misconfigured webhook URL in the Paystack dashboard). Unlike patchOrder,
  // this hits its own route — it asks Paystack whether the charge actually
  // succeeded before writing anything, rather than trusting the admin's say-so.
  const handleVerifyPayment = useCallback(
    async (order: AwardOrder) => {
      setSavingId(order.id)
      try {
        const response = await fetch('/api/admin/awards/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        })
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          toast.error(data?.message || 'Could not verify this payment.')
          return
        }

        if (data?.confirmed === false) {
          toast.error(data?.message || 'Paystack does not confirm this payment.')
          return
        }

        toast.success(data?.message || 'Payment confirmed with Paystack.')
        await fetchOrders()
      } catch (error) {
        console.error('Error verifying award payment:', error)
        toast.error('Could not verify this payment.')
      } finally {
        setSavingId(null)
      }
    },
    [fetchOrders],
  )

  if (loading) {
    return (
      <div className="award-orders-page space-y-6 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (setupMessage) {
    return (
      <div className="award-orders-page space-y-6 pb-4">
        <PageHeader eyebrow="Awards & delivery" title="Award orders" description="Payments, shipping quotes and dispatch—all in one operational view." />
        <div className="admin-panel award-empty-state">
          <span className="award-empty-icon"><Package aria-hidden="true" /></span>
          <h2>Awards are not set up yet</h2>
          <p>{setupMessage}</p>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="award-orders-page space-y-6 pb-4">
        <PageHeader eyebrow="Awards & delivery" title="Award orders" description="Payments, shipping quotes and dispatch—all in one operational view." />
        <div className="admin-panel award-empty-state award-empty-error">
            <span className="award-empty-icon"><AlertTriangle aria-hidden="true" /></span>
            <h2>Could not load award orders</h2>
            <p>{errorMessage}</p>
            <Button variant="outline" onClick={fetchOrders} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="award-orders-page space-y-6 pb-4">
      <PageHeader
        eyebrow="Awards & delivery"
        title="Award orders"
        description="Track every payment, resolve delivery issues, and keep awards moving."
        actions={
          <Button variant="outline" onClick={fetchOrders}>
            <RefreshCw className="h-4 w-4" />
            Refresh orders
          </Button>
        }
      />

      {/* Stats */}
      <section aria-labelledby="award-pulse-heading" className="space-y-3">
        <div className="award-section-heading">
          <div><p className="admin-kicker">Live operations</p><h2 id="award-pulse-heading">Delivery pulse</h2></div>
          <p>{stats.total === 0 ? 'Waiting for the first order' : `${stats.total} order${stats.total === 1 ? '' : 's'} recorded`}</p>
        </div>
        <div className="award-metrics">
          <article className="award-metric">
            <span><Award aria-hidden="true" /></span><div><strong>{stats.total}</strong><p>Total orders</p><small>Across every status</small></div>
          </article>
          <article className={`award-metric ${stats.paidNoWaybill > 0 ? 'award-metric-urgent' : ''}`}>
            <button
              type="button"
              className="award-metric-button"
              onClick={() => setStatusFilter('paid_no_waybill')}
            >
              <span><AlertTriangle aria-hidden="true" /></span><div><strong>{stats.paidNoWaybill}</strong><p>Needs dispatch</p><small>Paid, no waybill</small></div>
            </button>
          </article>
          <article className="award-metric">
            <span><AlertTriangle aria-hidden="true" /></span><div><strong>{stats.quoteFailed}</strong><p>Quote failed</p><small>Needs a manual price</small></div>
          </article>
          <article className="award-metric">
            <span><Truck aria-hidden="true" /></span><div><strong>{stats.dispatchedOrLater}</strong><p>On the move</p><small>Dispatched or delivered</small></div>
          </article>
        </div>
      </section>

      {/* Requirement A: the paid-without-waybill recovery queue. Rendered
          unconditionally above the filters and the main table whenever it is
          non-empty — this is the only place a stalled dispatch is ever
          discovered, so it must never depend on which filter is selected. */}
      {paidWithoutWaybill.length > 0 && (
        <Card className="border-destructive/60 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive text-xl sm:text-2xl">
              <AlertTriangle className="h-6 w-6" />
              {paidWithoutWaybill.length} order{paidWithoutWaybill.length === 1 ? '' : 's'} paid but not dispatched
            </CardTitle>
            <CardDescription>
              The courier booking failed, or did not finish, for these orders. The member has already paid — record
              the courier waybill below to mark each one dispatched. Nothing else will ever surface these
              automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {paidWithoutWaybill.map((order) => (
              <div key={order.id} className="rounded-2xl border border-destructive/30 bg-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold">{order.memberName}</p>
                    <p className="text-xs text-muted-foreground">{order.memberEmail}</p>
                  </div>
                  <div className="text-sm font-medium">
                    {order.totalAmountKobo != null ? formatNaira(order.totalAmountKobo) : 'Total unknown'}
                    <span className="text-muted-foreground"> · paid {order.paidAt ? formatDate(order.paidAt) : '—'}</span>
                  </div>
                </div>

                {order.adminNote && (
                  <div className="rounded-lg bg-muted/60 p-3 text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                    {order.adminNote}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Courier waybill number"
                    value={waybillDrafts[order.id] ?? ''}
                    onChange={(event) =>
                      setWaybillDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))
                    }
                    className="sm:max-w-xs"
                  />
                  <Button
                    size="sm"
                    disabled={savingId === order.id}
                    onClick={() => handleRecordWaybill(order)}
                  >
                    {savingId === order.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Truck className="h-4 w-4 mr-2" />
                    )}
                    Record waybill &amp; mark dispatched
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <section className="admin-panel award-toolbar" aria-label="Order filters">
          <div className="award-toolbar-copy">
            <p className="admin-kicker">Order queue</p>
            <h2>{statusFilter === 'all' ? 'All award orders' : statusFilter === 'paid_no_waybill' ? 'Orders needing dispatch' : STATUS_LABELS[statusFilter]}</h2>
            <p>Showing {filteredOrders.length} of {orders.length}</p>
          </div>
          <div className="award-toolbar-actions">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="paid_no_waybill">
                  Paid, no waybill {stats.paidNoWaybill > 0 ? `(${stats.paidNoWaybill})` : ''}
                </SelectItem>
                {ALL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </section>

      {/* Orders */}
      {filteredOrders.length === 0 ? (
        <div className="admin-panel award-empty-state">
            <span className="award-empty-icon"><Package aria-hidden="true" /></span>
            <p className="admin-kicker">Queue clear</p>
            <h2>{statusFilter === 'all' ? 'No award orders yet' : 'No orders match this filter'}</h2>
            <p>
              {statusFilter === 'all' ? 'No award orders have been started yet.' : 'No orders match this filter.'}
            </p>
            {statusFilter !== 'all' ? <Button variant="outline" onClick={() => setStatusFilter('all')}>View all orders</Button> : null}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const nextStatuses = MANUAL_ADVANCE_TARGETS.filter((candidate) =>
              canTransition(order.status, candidate),
            )

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{order.memberName}</h3>
                        <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{STATUS_LABELS[order.status]}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.memberEmail}</p>
                    </div>
                    <div className="text-sm md:text-right">
                      <p className="font-semibold">
                        {order.totalAmountKobo != null ? formatNaira(order.totalAmountKobo) : 'Awaiting shipping quote'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Award {formatNaira(order.awardAmountKobo)}
                        {order.shippingAmountKobo != null ? ` + shipping ${formatNaira(order.shippingAmountKobo)}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground/70 block">Created</span>
                      {formatDate(order.createdAt)}
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground/70 block">Waybill</span>
                      {order.waybill ? (
                        order.trackingUrl ? (
                          <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            {order.waybill}
                          </a>
                        ) : (
                          order.waybill
                        )
                      ) : (
                        '— not yet dispatched'
                      )}
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground/70 block">
                        Delivery status
                      </span>
                      {order.deliveryStatus ?? '—'}
                    </div>
                  </div>

                  {order.adminNote && (
                    <div className="rounded-lg bg-muted/50 p-3 text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                      {order.adminNote}
                    </div>
                  )}

                  {/* Manual shipping price override — the only path back to a
                      payable order once GIG could not quote a destination. */}
                  {order.status === 'quote_failed' && (
                    <div className="rounded-xl border border-border/60 p-3 space-y-2">
                      <label className="text-sm font-medium block">
                        Set shipping price manually (in kobo, not naira — e.g. 350000 kobo = ₦3,500)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          placeholder="Shipping amount in kobo"
                          value={shippingDrafts[order.id] ?? ''}
                          onChange={(event) =>
                            setShippingDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))
                          }
                          className="sm:max-w-xs"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={savingId === order.id}
                          onClick={() => handleSetShippingPrice(order)}
                        >
                          {savingId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Set price &amp; re-quote
                        </Button>
                      </div>
                      {(() => {
                        const parsed = Number(shippingDrafts[order.id] ?? '')
                        const validPreview =
                          (shippingDrafts[order.id] ?? '').trim() !== '' && Number.isInteger(parsed) && parsed >= 0
                        return validPreview ? (
                          <p className="text-xs text-muted-foreground">
                            = {formatNaira(parsed)} shipping · total will be{' '}
                            {formatNaira(totalKobo(order.awardAmountKobo, parsed))}
                          </p>
                        ) : null
                      })()}
                    </div>
                  )}

                  {/* Fallback for a webhook that never arrives (most commonly
                      a misconfigured webhook URL in the Paystack dashboard).
                      Only offered while there is something to check — a
                      Paystack reference — and only before this order is
                      already recorded as paid, since the webhook is still the
                      normal path and this route refuses to re-confirm a paid
                      order anyway. */}
                  {order.paystackReference && !isPaid(order.status) && (
                    <div className="rounded-xl border border-border/60 p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <label className="text-sm font-medium block">Verify payment with Paystack</label>
                          <p className="text-xs text-muted-foreground">
                            Asks Paystack directly whether reference {order.paystackReference} actually succeeded —
                            use this when a payment should have landed but the order is stuck (e.g. the webhook never
                            arrived).
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={savingId === order.id}
                          onClick={() => handleVerifyPayment(order)}
                          className="sm:shrink-0"
                        >
                          {savingId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 mr-2" />
                          )}
                          Verify with Paystack
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Waybill entry also lives here so it is reachable from the
                      main table, not only from the recovery banner above. */}
                  {order.status === 'paid' && !order.waybill && (
                    <div className="rounded-xl border border-destructive/40 p-3 space-y-2">
                      <label className="text-sm font-medium block">Record courier waybill</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Courier waybill number"
                          value={waybillDrafts[order.id] ?? ''}
                          onChange={(event) =>
                            setWaybillDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))
                          }
                          className="sm:max-w-xs"
                        />
                        <Button size="sm" disabled={savingId === order.id} onClick={() => handleRecordWaybill(order)}>
                          {savingId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Truck className="h-4 w-4 mr-2" />
                          )}
                          Record waybill &amp; mark dispatched
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Admin note — appended, never overwritten, so a manual note
                      never erases an automated one (duplicate-charge warnings,
                      booking failures). */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Add admin note</label>
                    <Textarea
                      value={noteDrafts[order.id] ?? ''}
                      onChange={(event) => setNoteDrafts((prev) => ({ ...prev, [order.id]: event.target.value }))}
                      placeholder="Add an internal note about this order..."
                      rows={2}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={savingId === order.id}
                      onClick={() => handleSaveNote(order)}
                    >
                      {savingId === order.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save note
                    </Button>
                  </div>

                  {nextStatuses.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
                      <span className="text-xs text-muted-foreground pt-2">Quick actions:</span>
                      {nextStatuses.map((next) => (
                        <Button
                          key={next}
                          size="sm"
                          variant={next === 'cancelled' ? 'destructive' : 'ghost'}
                          disabled={savingId === order.id}
                          onClick={() => handleAdvanceStatus(order, next)}
                          className="mt-2"
                        >
                          Mark {STATUS_LABELS[next].toLowerCase()}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
