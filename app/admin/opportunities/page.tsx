'use client'

// app/admin/opportunities/page.tsx
// Admin console for the member-only opportunities store: every listing, its
// status and visibility tier, a create/edit dialog covering every field, the
// publish / close / archive actions, and a delete confirm.
//
// Styling follows app/admin/awards/page.tsx (shadcn Card/Badge/Dialog on the
// admin surface, not the cream member-hub language).
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Archive,
  Briefcase,
  CheckCircle2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// lib/opportunities/types.ts is dependency-free and safe client-side.
// lib/opportunities/server.ts is server-only and deliberately not imported.
import {
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_TYPES,
  OPPORTUNITY_VISIBILITIES,
  STATUS_LABELS,
  VISIBILITY_LABELS,
  formatDeadlineCountdown,
  formatDeadlineDate,
  type Opportunity,
  type OpportunityStatus,
  type OpportunityVisibility,
} from '@/lib/opportunities/types'

type FormState = {
  title: string
  type: string
  organization: string
  location: string
  summary: string
  description: string
  applicationUrl: string
  contactEmail: string
  deadline: string
  amountNote: string
  visibility: OpportunityVisibility
  isFeatured: boolean
  status: OpportunityStatus
}

const EMPTY_FORM: FormState = {
  title: '',
  type: 'Scholarship',
  organization: '',
  location: '',
  summary: '',
  description: '',
  applicationUrl: '',
  contactEmail: '',
  deadline: '',
  amountNote: '',
  visibility: 'members',
  isFeatured: false,
  status: 'draft',
}

const STATUS_BADGE: Record<OpportunityStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'outline',
  published: 'default',
  closed: 'secondary',
  archived: 'outline',
}

function formToPayload(form: FormState) {
  return {
    title: form.title.trim(),
    type: form.type,
    organization: form.organization.trim(),
    location: form.location.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    applicationUrl: form.applicationUrl.trim(),
    contactEmail: form.contactEmail.trim(),
    deadline: form.deadline.trim(),
    amountNote: form.amountNote.trim(),
    visibility: form.visibility,
    isFeatured: form.isFeatured,
    status: form.status,
  }
}

function opportunityToForm(opportunity: Opportunity): FormState {
  return {
    title: opportunity.title,
    type: opportunity.type,
    organization: opportunity.organization ?? '',
    location: opportunity.location ?? '',
    summary: opportunity.summary ?? '',
    description: opportunity.description ?? '',
    applicationUrl: opportunity.applicationUrl ?? '',
    contactEmail: opportunity.contactEmail ?? '',
    deadline: opportunity.deadline ?? '',
    amountNote: opportunity.amountNote ?? '',
    visibility: opportunity.visibility,
    isFeatured: opportunity.isFeatured,
    status: opportunity.status,
  }
}

export default function AdminOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [setupMessage, setSetupMessage] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | OpportunityStatus>('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchOpportunities = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    setSetupMessage(null)
    try {
      const response = await fetch('/api/admin/opportunities')
      const data = await response.json().catch(() => ({}))

      if (response.status === 503) {
        setSetupMessage(data?.message || 'The opportunities database is not set up yet.')
        setOpportunities([])
        return
      }
      if (!response.ok) {
        setErrorMessage(data?.message || 'Failed to load opportunities.')
        setOpportunities([])
        return
      }
      setOpportunities(data?.opportunities ?? [])
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      setErrorMessage('Failed to load opportunities.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? opportunities
        : opportunities.filter((item) => item.status === statusFilter),
    [opportunities, statusFilter],
  )

  const stats = useMemo(
    () => ({
      total: opportunities.length,
      published: opportunities.filter((item) => item.status === 'published').length,
      exclusive: opportunities.filter((item) => item.visibility !== 'public').length,
      drafts: opportunities.filter((item) => item.status === 'draft').length,
    }),
    [opportunities],
  )

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(opportunity: Opportunity) {
    setEditingId(opportunity.id)
    setForm(opportunityToForm(opportunity))
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (form.title.trim().length < 3) {
      toast.error('Give this opportunity a title of at least 3 characters.')
      return
    }

    setSaving(true)
    try {
      const url = editingId ? `/api/admin/opportunities/${editingId}` : '/api/admin/opportunities'
      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form)),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast.error(data?.message || 'Could not save this opportunity.')
        return
      }

      toast.success(editingId ? 'Opportunity updated.' : 'Opportunity created.')
      setDialogOpen(false)
      setEditingId(null)
      await fetchOpportunities()
    } catch (error) {
      console.error('Error saving opportunity:', error)
      toast.error('Could not save this opportunity.')
    } finally {
      setSaving(false)
    }
  }

  const patchStatus = useCallback(
    async (opportunity: Opportunity, status: OpportunityStatus) => {
      setBusyId(opportunity.id)
      try {
        const response = await fetch(`/api/admin/opportunities/${opportunity.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          // The publish gate lands here: an opportunity with no application
          // link and no contact email cannot be published.
          toast.error(data?.message || 'Could not update this opportunity.')
          return
        }
        toast.success(`Marked ${STATUS_LABELS[status].toLowerCase()}.`)
        await fetchOpportunities()
      } catch (error) {
        console.error('Error updating opportunity status:', error)
        toast.error('Could not update this opportunity.')
      } finally {
        setBusyId(null)
      }
    },
    [fetchOpportunities],
  )

  async function handleDelete() {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      const response = await fetch(`/api/admin/opportunities/${deleteTarget.id}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(data?.message || 'Could not delete this opportunity.')
        return
      }
      toast.success('Opportunity deleted.')
      setDeleteTarget(null)
      await fetchOpportunities()
    } catch (error) {
      console.error('Error deleting opportunity:', error)
      toast.error('Could not delete this opportunity.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 pt-8 space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    )
  }

  if (setupMessage) {
    return (
      <div className="container mx-auto py-8 pt-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Opportunities are not set up yet</h3>
            <p className="text-muted-foreground">{setupMessage}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto py-8 pt-8">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="font-semibold text-lg">Could not load opportunities</h3>
            <p className="text-muted-foreground">{errorMessage}</p>
            <Button variant="outline" onClick={fetchOpportunities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 pt-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-700 bg-clip-text text-transparent">
            Opportunities
          </h1>
          <p className="text-muted-foreground">
            Scholarships, fellowships, grants and roles — and who in the network gets to see them.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New opportunity
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Briefcase className="h-5 w-5 text-gray-600" />} value={stats.total} label="Total" />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          value={stats.published}
          label="Published"
          tone="bg-emerald-100"
        />
        <StatCard
          icon={<Eye className="h-5 w-5 text-orange-600" />}
          value={stats.exclusive}
          label="Member-only"
          tone="bg-orange-100"
        />
        <StatCard
          icon={<Pencil className="h-5 w-5 text-amber-700" />}
          value={stats.drafts}
          label="Drafts"
          tone="bg-amber-100"
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | OpportunityStatus)}
            >
              <SelectTrigger className="w-full md:w-[240px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {OPPORTUNITY_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchOpportunities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No opportunities</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === 'all'
                ? 'Nothing has been posted yet. Create the first listing for the network.'
                : 'No opportunities match this filter.'}
            </p>
            {statusFilter === 'all' && (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New opportunity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((opportunity) => (
                  <TableRow key={opportunity.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {opportunity.isFeatured && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-400 shrink-0" />
                        )}
                        <span>{opportunity.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {opportunity.organization || 'No organisation'}
                        {opportunity.location ? ` · ${opportunity.location}` : ''}
                      </p>
                      {!opportunity.applicationUrl && !opportunity.contactEmail && (
                        <p className="text-xs text-destructive mt-1">
                          No application link or contact email — cannot be published.
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{opportunity.type}</TableCell>
                    <TableCell>
                      <Badge variant={opportunity.visibility === 'public' ? 'outline' : 'secondary'}>
                        {VISIBILITY_LABELS[opportunity.visibility]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[opportunity.status]}>
                        {STATUS_LABELS[opportunity.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{formatDeadlineDate(opportunity.deadline)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDeadlineCountdown(opportunity.deadline)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        {opportunity.status !== 'published' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === opportunity.id}
                            onClick={() => patchStatus(opportunity, 'published')}
                          >
                            {busyId === opportunity.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                            )}
                            Publish
                          </Button>
                        )}
                        {opportunity.status === 'published' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === opportunity.id}
                            onClick={() => patchStatus(opportunity, 'closed')}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Close
                          </Button>
                        )}
                        {opportunity.status !== 'archived' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === opportunity.id}
                            onClick={() => patchStatus(opportunity, 'archived')}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(opportunity)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === opportunity.id}
                          onClick={() => setDeleteTarget(opportunity)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete {opportunity.title}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit opportunity' : 'New opportunity'}</DialogTitle>
            <DialogDescription>
              Members only see published listings their visibility tier allows. Publishing requires an
              application link or a contact email.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="opp-title">Title</Label>
              <Input
                id="opp-title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="e.g. Mastercard Foundation Scholars Programme 2027"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="opp-type">Type</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                  <SelectTrigger id="opp-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-organization">Organisation</Label>
                <Input
                  id="opp-organization"
                  value={form.organization}
                  onChange={(event) => setForm({ ...form, organization: event.target.value })}
                  placeholder="Who is offering this?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-location">Location</Label>
                <Input
                  id="opp-location"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                  placeholder="Remote, Lagos, Pan-African…"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-deadline">Deadline</Label>
                <Input
                  id="opp-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for a rolling listing. A past deadline is rejected on create.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-amount">Amount note</Label>
                <Input
                  id="opp-amount"
                  value={form.amountNote}
                  onChange={(event) => setForm({ ...form, amountNote: event.target.value })}
                  placeholder="e.g. Full tuition + stipend"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-contact">Contact email</Label>
                <Input
                  id="opp-contact"
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                  placeholder="applications@example.org"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="opp-url">Application link</Label>
              <Input
                id="opp-url"
                value={form.applicationUrl}
                onChange={(event) => setForm({ ...form, applicationUrl: event.target.value })}
                placeholder="https://…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opp-summary">Summary</Label>
              <Textarea
                id="opp-summary"
                rows={2}
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
                placeholder="One or two lines shown on the member card."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opp-description">Description (markdown)</Label>
              <Textarea
                id="opp-description"
                rows={6}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Eligibility, benefits, how to apply…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="opp-visibility">Visibility</Label>
                <Select
                  value={form.visibility}
                  onValueChange={(value) => setForm({ ...form, visibility: value as OpportunityVisibility })}
                >
                  <SelectTrigger id="opp-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_VISIBILITIES.map((visibility) => (
                      <SelectItem key={visibility} value={visibility}>
                        {VISIBILITY_LABELS[visibility]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Public is visible to anyone. Members only is any signed-in member. Approved awardees is
                  the exclusive tier.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm({ ...form, status: value as OpportunityStatus })}
                >
                  <SelectTrigger id="opp-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPPORTUNITY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="opp-featured">Featured</Label>
                <p className="text-xs text-muted-foreground">Pins this to the top of the member feed.</p>
              </div>
              <Switch
                id="opp-featured"
                checked={form.isFeatured}
                onCheckedChange={(checked) => setForm({ ...form, isFeatured: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? 'Save changes' : 'Create opportunity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this opportunity?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be removed for everyone, along with every member&apos;s
              bookmark of it. This cannot be undone — archive it instead if you only want it out of the
              feed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  tone = 'bg-gray-100',
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone?: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${tone} flex items-center justify-center`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
