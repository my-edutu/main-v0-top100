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
  Truck,
} from 'lucide-react'

// `lib/awards/money.ts` and `lib/awards/status.ts` are plain, dependency-free
// logic — safe to import client-side. `lib/awards/server.ts` is explicitly
// server-only ("Never import into a client component"), so its types are not
// imported here; the shape below is this page's own copy of what the GET
// route actually returns.
import { formatNaira, totalKobo } from '@/lib/awards/money'
import { canTransition, type AwardStatus } from '@/lib/awards/status'

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

  if (loading) {
    return (
      <div className="container mx-auto py-8 pt-20 lg:pt-8 space-y-8">
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
      <div className="container mx-auto py-8 pt-20 lg:pt-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Awards are not set up yet</h3>
            <p className="text-muted-foreground">{setupMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto py-8 pt-20 lg:pt-8">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="font-semibold text-lg">Could not load award orders</h3>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 pt-20 lg:pt-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-700 bg-clip-text text-transparent">
          Award Orders
        </h1>
        <p className="text-muted-foreground">
          Africa Future Leaders award payments, shipping quotes and dispatch.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Award className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={stats.paidNoWaybill > 0 ? 'border-destructive/50 shadow-destructive/10' : undefined}
        >
          <CardContent className="pt-6">
            <button
              type="button"
              className="flex items-center gap-3 w-full text-left"
              onClick={() => setStatusFilter('paid_no_waybill')}
            >
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  stats.paidNoWaybill > 0 ? 'bg-destructive/15' : 'bg-gray-100'
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 ${stats.paidNoWaybill > 0 ? 'text-destructive' : 'text-gray-600'}`}
                />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stats.paidNoWaybill > 0 ? 'text-destructive' : ''}`}>
                  {stats.paidNoWaybill}
                </p>
                <p className="text-xs text-muted-foreground">Paid, no waybill</p>
              </div>
            </button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.quoteFailed}</p>
                <p className="text-xs text-muted-foreground">Quote failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.dispatchedOrLater}</p>
                <p className="text-xs text-muted-foreground">Dispatched+</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full md:w-[240px]">
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
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No orders</h3>
            <p className="text-muted-foreground">
              {statusFilter === 'all' ? 'No award orders have been started yet.' : 'No orders match this filter.'}
            </p>
          </CardContent>
        </Card>
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
