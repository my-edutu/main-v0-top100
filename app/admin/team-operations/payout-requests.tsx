'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ChevronLeft, ChevronRight, Clipboard, Loader2, RefreshCw, WalletCards, X } from 'lucide-react'
import { toast } from 'sonner'
import type { PayoutStatus, TeamPayout, TeamPayoutPage } from '@/lib/team-operations/payouts'
import styles from './payout-requests.module.css'

type PayoutFilter = 'open' | 'paid' | 'all'
type PayoutAction = 'approve' | 'reject' | 'pay'

const statusLabels: Record<PayoutStatus, string> = {
  requested: 'Requested',
  under_review: 'Under review',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

const statusClassNames: Record<PayoutStatus, string> = {
  requested: styles.statusRequested,
  under_review: styles.statusReview,
  approved: styles.statusApproved,
  processing: styles.statusProcessing,
  paid: styles.statusPaid,
  rejected: styles.statusRejected,
  cancelled: styles.statusCancelled,
}

const dateFormatter = new Intl.DateTimeFormat('en-NG', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Africa/Lagos',
})

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : dateFormatter.format(date)
}

function formatAmount(amountMinor: number, currency: string) {
  const code = currency.trim().toUpperCase() || 'NGN'
  const amount = amountMinor / 100
  try {
    return new Intl.NumberFormat(code === 'NGN' ? 'en-NG' : 'en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${code} ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
}

function statusLabel(status: PayoutStatus) {
  return statusLabels[status] ?? status.replaceAll('_', ' ')
}

function statusClass(status: PayoutStatus) {
  return statusClassNames[status] ?? styles.statusDefault
}

function canApprove(status: PayoutStatus) {
  return status === 'requested' || status === 'under_review'
}

function canConfirmPayment(status: PayoutStatus) {
  return status === 'approved' || status === 'processing'
}

export function PayoutRequests({ teamId, onUpdated }: { teamId: string; onUpdated: () => Promise<void> }) {
  const [pageData, setPageData] = useState<TeamPayoutPage | null>(null)
  const [filter, setFilter] = useState<PayoutFilter>('open')
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  const [references, setReferences] = useState<Record<string, string>>({})
  const requestVersion = useRef(0)
  const mutationInFlight = useRef(false)

  const load = useCallback(async () => {
    if (!teamId) return
    const version = ++requestVersion.current
    setLoading(true)
    setError('')
    const query = new URLSearchParams({ teamId, page: String(pageNumber), status: filter })
    try {
      const response = await fetch(`/api/admin/team-operations/payouts?${query.toString()}`, { cache: 'no-store' })
      const payload = await response.json() as TeamPayoutPage & { message?: string }
      if (!response.ok) throw new Error(payload.message || 'Could not load payment requests.')
      if (version === requestVersion.current) {
        const lastPage = totalPages(payload)
        if (pageNumber > lastPage) {
          setPageData(null)
          setPageNumber(lastPage)
        } else setPageData(payload)
      }
    } catch (cause) {
      if (version !== requestVersion.current) return
      const message = cause instanceof Error ? cause.message : 'Could not load payment requests.'
      setError(message)
      toast.error(message)
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [filter, pageNumber, teamId])

  // The panel owns this request lifecycle so a queue failure does not hide team access.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  function changeFilter(nextFilter: PayoutFilter) {
    if (mutationInFlight.current) return
    requestVersion.current += 1
    setFilter(nextFilter)
    setPageNumber(1)
    setPageData(null)
  }

  function changePage(nextPage: number) {
    if (mutationInFlight.current || nextPage < 1 || (pageData && nextPage > totalPages(pageData))) return
    requestVersion.current += 1
    setPageNumber(nextPage)
    setPageData(null)
  }

  async function mutate(request: TeamPayout, action: PayoutAction) {
    if (mutationInFlight.current || !request.canManage || request.isOwnRequest) return
    const reference = references[request.id]?.trim() ?? ''
    if (action === 'pay' && !reference) return
    mutationInFlight.current = true
    setWorking(`${request.id}:${action}`)
    try {
      const response = await fetch(`/api/admin/team-operations/payouts/${encodeURIComponent(request.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          expectedStatus: request.status,
          ...(action === 'pay' ? { reference } : {}),
        }),
      })
      const payload = await response.json() as { message?: string }
      if (!response.ok) throw new Error(payload.message || 'Could not update this payment request.')

      await Promise.all([load(), onUpdated()])
      if (action === 'pay') setReferences(current => ({ ...current, [request.id]: '' }))
      toast.success(payload.message || (action === 'approve' ? 'Payment request approved.' : action === 'pay' ? 'Payment recorded.' : 'Payment request rejected.'))
    } catch (cause) {
      // Keep the transfer reference in state so a failed attempt can be corrected and retried.
      toast.error(cause instanceof Error ? cause.message : 'Could not update this payment request.')
    } finally { mutationInFlight.current = false; setWorking(null) }
  }

  function reject(request: TeamPayout) {
    if (!window.confirm(`Reject the payment request from ${request.requesterName}?`)) return
    void mutate(request, 'reject')
  }

  const totalPageCount = pageData ? totalPages(pageData) : 1
  const requests = pageData?.requests ?? []
  const showingErrorOnly = Boolean(error && !pageData)

  return <section className={styles.panel} aria-labelledby="payout-requests-heading">
    <div className={styles.header}>
      <div className={styles.headingCopy}>
        <div className={styles.headingLine}><WalletCards size={19} aria-hidden="true" /><h2 id="payout-requests-heading">Withdrawal and payment requests</h2></div>
        <p>Review requests and record completed transfers for this team.</p>
      </div>
      <div className={styles.controls}>
        <label className={styles.filterLabel}>Show
          <select className={styles.select} value={filter} onChange={event => changeFilter(event.target.value as PayoutFilter)} disabled={working !== null || (loading && !pageData)}>
            <option value="open">Open requests</option>
            <option value="paid">Paid requests</option>
            <option value="all">All requests</option>
          </select>
        </label>
        <button type="button" className={styles.button} onClick={() => void load()} disabled={loading || working !== null}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Refresh
        </button>
      </div>
    </div>

    {error ? <p role="alert" className={styles.error}>{error} <button type="button" className={styles.retry} disabled={working !== null} onClick={() => void load()}>Try again</button></p> : null}

    {loading && !pageData ? <div className={styles.state} role="status"><Loader2 size={20} className="animate-spin" aria-hidden="true" />Loading payment requests…</div> : showingErrorOnly ? <div className={styles.state}>Payment requests could not be loaded.</div> : requests.length ? <>
      <div className={styles.queue}>
        {requests.map(request => <PayoutCard
          key={request.id}
          request={request}
          reference={references[request.id] ?? ''}
          working={working}
          onReferenceChange={value => setReferences(current => ({ ...current, [request.id]: value }))}
          onApprove={() => void mutate(request, 'approve')}
          onReject={() => reject(request)}
          onPay={event => { event.preventDefault(); void mutate(request, 'pay') }}
          onCopy={async () => {
            if (!request.accountNumber) return
            try {
              await navigator.clipboard.writeText(request.accountNumber)
              toast.success('Account number copied.')
            } catch { toast.error('Copy is unavailable. Select the account number to copy it.') }
          }}
        />)}
      </div>
      {pageData ? <Pagination page={pageData.page} totalPages={totalPageCount} total={pageData.total} pageSize={pageData.pageSize} disabled={loading || working !== null} onPage={changePage} /> : null}
    </> : <div className={styles.empty}>
      <WalletCards size={22} aria-hidden="true" />
      <p>{filter === 'paid' ? 'No paid requests yet.' : filter === 'all' ? 'No payment requests yet.' : 'No open withdrawal requests.'}</p>
      <span>New requests will appear here when a team member asks to withdraw.</span>
    </div>}
  </section>
}

function PayoutCard({
  request,
  reference,
  working,
  onReferenceChange,
  onApprove,
  onReject,
  onPay,
  onCopy,
}: {
  request: TeamPayout
  reference: string
  working: string | null
  onReferenceChange: (value: string) => void
  onApprove: () => void
  onReject: () => void
  onPay: (event: FormEvent<HTMLFormElement>) => void
  onCopy: () => Promise<void>
}) {
  const isWorking = working?.startsWith(`${request.id}:`) ?? false
  const canAct = request.canManage && !request.isOwnRequest
  const bankDetailsComplete = request.payoutMethod !== 'bank_transfer' || !!(request.bankName && request.accountName && request.accountNumber)
  const destination = request.otherDestination || 'No alternate destination provided'

  return <article className={styles.card} aria-label={`${request.requesterName} payment request`}>
    <header className={styles.cardHeader}>
      <div className={styles.identity}>
        <span className={styles.avatar} aria-hidden="true">{request.requesterName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>
        <div><h3>{request.requesterName}</h3><p>Requested {formatDate(request.requestedAt)}</p></div>
      </div>
      <span className={`${styles.status} ${statusClass(request.status)}`}>{statusLabel(request.status)}</span>
    </header>

    <dl className={styles.facts}>
      <div className={styles.fact}><dt>Amount</dt><dd className={styles.amount}>{formatAmount(request.amountMinor, request.currency)}</dd></div>
      <div className={styles.fact}><dt>Payment method</dt><dd>{request.payoutMethod === 'bank_transfer' ? 'Bank transfer' : request.payoutMethod === 'paystack' ? 'Paystack' : 'Other'}</dd></div>
      <div className={styles.fact}><dt>Bank</dt><dd>{request.bankName || '—'}</dd></div>
      <div className={styles.fact}><dt>Account name</dt><dd>{request.accountName || '—'}</dd></div>
      <div className={`${styles.fact} ${styles.accountFact}`}><dt>Account number</dt><dd className={styles.accountValue}>{request.accountNumber ? <code>{request.accountNumber}</code> : <span>{destination}</span>}{request.accountNumber ? <button type="button" className={styles.copyButton} onClick={() => void onCopy()} aria-label={`Copy account number for ${request.requesterName}`} title="Copy account number"><Clipboard size={16} aria-hidden="true" /></button> : null}</dd></div>
    </dl>

    {canAct && canApprove(request.status) ? <div className={styles.actions}>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onApprove} disabled={working !== null}><Check size={16} aria-hidden="true" />{isWorking ? 'Approving…' : 'Approve request'}</button>
      <button type="button" className={`${styles.button} ${styles.danger}`} onClick={onReject} disabled={working !== null}><X size={16} aria-hidden="true" />Reject request</button>
    </div> : null}

    {canAct && canConfirmPayment(request.status) && bankDetailsComplete ? <PaymentConfirmation request={request} reference={reference} disabled={working !== null} isWorking={isWorking} onReferenceChange={onReferenceChange} onSubmit={onPay} /> : null}
    {canAct && canConfirmPayment(request.status) && !bankDetailsComplete ? <p className={styles.permissionHint}>Complete bank, account name and account number are needed before payment can be confirmed.</p> : null}

    {!canAct && request.isOwnRequest ? <p className={styles.permissionHint}>You can’t manage your own request.</p> : !canAct && request.status !== 'paid' && request.status !== 'rejected' && request.status !== 'cancelled' ? <p className={styles.permissionHint}>You don’t have permission to manage this request.</p> : null}
    {request.status === 'paid' && request.reference ? <p className={styles.referenceLine}>Transfer reference: <code>{request.reference}</code>{request.paidAt ? ` · Paid ${formatDate(request.paidAt)}` : ''}</p> : null}
  </article>
}

function PaymentConfirmation({
  request,
  reference,
  disabled,
  isWorking,
  onReferenceChange,
  onSubmit,
}: {
  request: TeamPayout
  reference: string
  disabled: boolean
  isWorking: boolean
  onReferenceChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <form className={styles.paymentForm} onSubmit={onSubmit}>
    <div className={styles.paymentHeading}><div><h4>Confirm payment</h4><p>Review the transfer details before recording it.</p></div><WalletCards size={18} aria-hidden="true" /></div>
    <p className={styles.paymentSummary}>{formatAmount(request.amountMinor, request.currency)} to {request.accountName || request.requesterName}{request.bankName ? ` · ${request.bankName}` : ''}{request.accountNumber || request.otherDestination ? ` · ${request.accountNumber || request.otherDestination}` : ''}</p>
    <label className={styles.referenceField}>Transfer reference
      <input value={reference} onChange={event => onReferenceChange(event.target.value)} required maxLength={160} placeholder="e.g. bank transfer reference" autoComplete="off" disabled={disabled} />
      <span>Required to confirm the transfer.</span>
    </label>
    <p className={styles.confirmationNote}>This records a completed transfer; it does not initiate a bank transfer.</p>
    <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={disabled || !reference.trim()}>{isWorking ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{isWorking ? 'Recording…' : 'Confirm payment'}</button>
  </form>
}

function Pagination({ page, totalPages: pages, total, pageSize, disabled, onPage }: { page: number; totalPages: number; total: number; pageSize: number; disabled: boolean; onPage: (page: number) => void }) {
  const first = total ? (page - 1) * pageSize + 1 : 0
  const last = Math.min(page * pageSize, total)
  return <nav className={styles.pagination} aria-label="Payment request pages">
    <span>Showing {first}–{last} of {total}</span>
    {pages > 1 ? <div className={styles.pageButtons}>
      <button type="button" className={styles.pageButton} onClick={() => onPage(page - 1)} disabled={disabled || page <= 1} aria-label="Previous page"><ChevronLeft size={17} aria-hidden="true" /></button>
      <span className={styles.pageNumber}>Page {page} of {pages}</span>
      <button type="button" className={styles.pageButton} onClick={() => onPage(page + 1)} disabled={disabled || page >= pages} aria-label="Next page"><ChevronRight size={17} aria-hidden="true" /></button>
    </div> : null}
  </nav>
}

function totalPages(pageData: TeamPayoutPage) {
  return Math.max(1, Math.ceil(pageData.total / Math.max(1, pageData.pageSize)))
}
