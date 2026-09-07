'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Clock3, DollarSign, Eye, FileText, Loader2, Mail, MessageSquare, Newspaper, Phone, RefreshCw, Search, User } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { formatFeatureRequestAmount, summarizeAdminFeatureRequests } from '@/lib/feature-requests/admin-summary'
import PageHeader from '../components/PageHeader'

type RequestStatus = 'pending' | 'contacted' | 'paid' | 'in_progress' | 'published' | 'cancelled'
type PaymentStatus = 'pending' | 'confirmed' | 'refunded'

interface FeatureRequest {
  id: string
  awardee_id: string
  awardee_name: string
  has_own_article: boolean
  article_content?: string
  needs_article_written: boolean
  contact_email: string
  whatsapp_number: string
  amount: number
  currency: string
  status: RequestStatus
  payment_status?: PaymentStatus
  admin_notes?: string
  created_at: string
  updated_at?: string
}

const statusColors: Record<RequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-900', contacted: 'bg-blue-100 text-blue-900',
  paid: 'bg-emerald-100 text-emerald-900', in_progress: 'bg-violet-100 text-violet-900',
  published: 'bg-teal-100 text-teal-900', cancelled: 'bg-red-100 text-red-900',
}
const paymentStatusColors: Record<PaymentStatus, string> = {
  pending: 'bg-amber-50 text-amber-900', confirmed: 'bg-emerald-50 text-emerald-900', refunded: 'bg-red-50 text-red-900',
}
const statusLabels: Record<RequestStatus, string> = {
  pending: 'Pending', contacted: 'Contacted', paid: 'Paid', in_progress: 'In progress', published: 'Published', cancelled: 'Cancelled',
}

export default function FeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null)
  const [updating, setUpdating] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/feature-requests')
      if (response.ok) {
        const data = await response.json()
        setRequests(data.data || [])
      } else toast.error('Failed to fetch feature requests')
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Failed to fetch feature requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function loadRequests() {
      try {
        const response = await fetch('/api/feature-requests')
        if (response.ok) {
          const data = await response.json()
          if (active) setRequests(data.data || [])
        } else toast.error('Failed to fetch feature requests')
      } catch (error) {
        console.error('Error fetching requests:', error)
        toast.error('Failed to fetch feature requests')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadRequests()
    return () => { active = false }
  }, [])

  const handleUpdateStatus = async (id: string, status: RequestStatus, paymentStatus?: PaymentStatus) => {
    setUpdating(true)
    try {
      const response = await fetch('/api/feature-requests', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, payment_status: paymentStatus, admin_notes: adminNotes }),
      })
      if (response.ok) {
        toast.success('Request updated successfully')
        fetchRequests()
        setSelectedRequest(null)
        setAdminNotes('')
      } else toast.error('Failed to update request')
    } catch { toast.error('Failed to update request') }
    finally { setUpdating(false) }
  }

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.awardee_name?.toLowerCase().includes(normalizedSearch) || request.contact_email?.toLowerCase().includes(normalizedSearch)
    return matchesSearch && (statusFilter === 'all' || request.status === statusFilter)
  })
  const stats = summarizeAdminFeatureRequests(requests)
  const hasFilters = Boolean(normalizedSearch || statusFilter !== 'all')
  const queueLabel = statusFilter === 'all' ? 'All requests' : statusLabels[statusFilter as RequestStatus]

  if (loading) return (
    <div className="feature-requests-admin-page space-y-6 pb-4" aria-busy="true">
      <div className="space-y-3 border-b border-[#e7e3dc] pb-6">
        <Skeleton className="feature-request-loading-block h-3 w-28" />
        <Skeleton className="feature-request-loading-block h-9 w-64" />
        <Skeleton className="feature-request-loading-block h-5 w-full max-w-xl" />
      </div>
      <div className="feature-request-metrics">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="feature-request-loading-block h-[132px] w-full rounded-[18px]" />)}</div>
      <Skeleton className="feature-request-loading-block h-28 w-full rounded-[18px]" />
      <Skeleton className="feature-request-loading-block h-72 w-full rounded-[18px]" />
    </div>
  )

  return (
    <div className="feature-requests-admin-page space-y-6 pb-4">
      <PageHeader eyebrow="Editorial pipeline" title="Feature requests" description="Review awardee submissions, confirm payment, and move each story into publication." />

      <section aria-labelledby="feature-request-overview-heading" className="space-y-3">
        <div className="feature-request-section-heading">
          <div><p className="admin-kicker">Live workload</p><h2 id="feature-request-overview-heading">Request overview</h2></div>
          <p>Counts update from the current submission queue.</p>
        </div>
        <div className="feature-request-metrics">
          <article className="feature-request-metric"><span><FileText aria-hidden="true" /></span><div><strong>{stats.total}</strong><p>All submissions</p><small>Every feature request</small></div></article>
          <article className="feature-request-metric"><span><Clock3 aria-hidden="true" /></span><div><strong>{stats.pending}</strong><p>Needs review</p><small>Awaiting a first decision</small></div></article>
          <article className="feature-request-metric"><span><DollarSign aria-hidden="true" /></span><div><strong>{stats.paymentCleared}</strong><p>Payment cleared</p><small>Paid or payment confirmed</small></div></article>
          <article className="feature-request-metric"><span><Newspaper aria-hidden="true" /></span><div><strong>{stats.published}</strong><p>Published</p><small>Stories now live</small></div></article>
        </div>
      </section>

      <section className="feature-request-toolbar admin-panel" aria-labelledby="feature-request-queue-heading">
        <div className="feature-request-toolbar-copy"><p className="admin-kicker">Review queue</p><h2 id="feature-request-queue-heading">{queueLabel}</h2><p>Showing {filteredRequests.length} of {requests.length} submissions</p></div>
        <div className="feature-request-toolbar-actions">
          <div className="feature-request-search"><Search aria-hidden="true" /><Input aria-label="Search feature requests" placeholder="Search name or email" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter feature requests by status"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchRequests}><RefreshCw aria-hidden="true" className="size-4" />Refresh</Button>
        </div>
      </section>

      {filteredRequests.length === 0 ? (
        <section className="feature-request-empty-state admin-panel" aria-live="polite">
          <div className="feature-request-empty-icon">{hasFilters ? <Search aria-hidden="true" /> : <Newspaper aria-hidden="true" />}</div>
          <p className="admin-kicker">{hasFilters ? 'No matches' : 'Queue clear'}</p>
          <h2>{hasFilters ? 'No requests match these filters' : 'No feature requests yet'}</h2>
          <p>{hasFilters ? 'Try another name, email, or request status.' : 'New awardee submissions will appear here for editorial review.'}</p>
          {hasFilters ? <Button variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('all') }}>Clear filters</Button> : null}
        </section>
      ) : (
        <div className="feature-request-list">
          {filteredRequests.map((request) => (
            <article key={request.id} className="feature-request-card">
              <div className="feature-request-card-main">
                <div className="feature-request-card-heading">
                  <div><p className="admin-kicker">Submitted {new Date(request.created_at).toLocaleDateString()}</p><h3>{request.awardee_name}</h3></div>
                  <div className="feature-request-badges">
                    <Badge className={statusColors[request.status]}>{statusLabels[request.status]}</Badge>
                    {request.payment_status ? <Badge variant="outline" className={paymentStatusColors[request.payment_status]}>Payment {request.payment_status}</Badge> : null}
                  </div>
                </div>
                <dl className="feature-request-contact-grid">
                  <div><dt><Mail aria-hidden="true" /> Email</dt><dd><a href={`mailto:${request.contact_email}`}>{request.contact_email}</a></dd></div>
                  <div><dt><Phone aria-hidden="true" /> WhatsApp</dt><dd><a href={`https://wa.me/${request.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{request.whatsapp_number}</a></dd></div>
                  <div><dt><FileText aria-hidden="true" /> Editorial support</dt><dd>{request.has_own_article ? 'Article supplied' : 'Writing requested'}</dd></div>
                </dl>
              </div>
              <div className="feature-request-card-aside">
                <p>Feature fee</p><strong>{formatFeatureRequestAmount(request.amount || 0, request.currency || 'NGN')}</strong>
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" onClick={() => { setSelectedRequest(request); setAdminNotes(request.admin_notes || '') }}><Eye aria-hidden="true" className="size-4" />Review request</Button></DialogTrigger>
                  <DialogContent className="feature-request-dialog max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader><p className="admin-kicker">Editorial review</p><DialogTitle>{request.awardee_name}</DialogTitle><DialogDescription>Submitted on {new Date(request.created_at).toLocaleString()}</DialogDescription></DialogHeader>
                    <div className="feature-request-dialog-body">
                      <div className="feature-request-dialog-summary">
                        <div><p>Email</p><a href={`mailto:${request.contact_email}`}>{request.contact_email}</a></div>
                        <div><p>WhatsApp</p><a href={`https://wa.me/${request.whatsapp_number.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">{request.whatsapp_number}</a></div>
                        <div><p>Feature fee</p><strong>{formatFeatureRequestAmount(request.amount || 0, request.currency || 'NGN')}</strong></div>
                      </div>
                      <section className="feature-request-article"><h4>{request.has_own_article ? 'Submitted article' : 'Article support'}</h4>{request.has_own_article && request.article_content ? <pre>{request.article_content}</pre> : <p>The awardee requested help writing the article.</p>}</section>
                      <section className="feature-request-update">
                        <div><p className="admin-kicker">Workflow</p><h4>Update this request</h4></div>
                        <div className="feature-request-update-grid">
                          <label><span>Request status</span><Select value={selectedRequest?.status || request.status} onValueChange={(value) => setSelectedRequest((previous) => previous ? { ...previous, status: value as RequestStatus } : null)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="contacted">Contacted</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select></label>
                          <label><span>Payment status</span><Select value={selectedRequest?.payment_status || request.payment_status || 'pending'} onValueChange={(value) => setSelectedRequest((previous) => previous ? { ...previous, payment_status: value as PaymentStatus } : null)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="refunded">Refunded</SelectItem></SelectContent></Select></label>
                        </div>
                        <label className="feature-request-notes"><span>Internal notes</span><Textarea value={adminNotes} onChange={(event) => setAdminNotes(event.target.value)} placeholder="Add context for the editorial team…" rows={3} /></label>
                        <Button className="w-full" disabled={updating} onClick={() => handleUpdateStatus(request.id, selectedRequest?.status || request.status, selectedRequest?.payment_status || request.payment_status)}>{updating ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <CheckCircle aria-hidden="true" className="size-4" />}Save changes</Button>
                      </section>
                      <section className="feature-request-quick-actions">
                        <h4>Contact and profile</h4>
                        <div>
                          <Button variant="outline" asChild><a href={`mailto:${request.contact_email}`}><Mail aria-hidden="true" className="size-4" />Send email</a></Button>
                          <Button variant="outline" asChild><a href={`https://wa.me/${request.whatsapp_number.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(request.awardee_name)}, regarding your feature request...`} target="_blank" rel="noreferrer"><MessageSquare aria-hidden="true" className="size-4" />WhatsApp</a></Button>
                          <Button variant="outline" asChild><Link href={`/admin/awardees/edit/${request.awardee_id}`}><User aria-hidden="true" className="size-4" />View awardee</Link></Button>
                        </div>
                      </section>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
