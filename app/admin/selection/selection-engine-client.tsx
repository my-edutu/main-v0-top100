'use client'

import {
  type FormEvent,
  type ComponentType,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cloud,
  Download,
  FileCheck2,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/utils/supabase/client'

const currentYear = new Date().getFullYear()

type IconComponent = ComponentType<{ className?: string }>

type IntegrationStatus = {
  googleWorkspace: boolean
  documentAi: boolean
  aiMerit: boolean
  cronWorker: boolean
}

type Job = {
  id: string
  cycleId: string
  cycleName: string
  cycleYear: number | null
  sourceType: 'google_form' | 'google_sheet' | 'pdf_upload'
  sourceLabel: string
  sourceProgress: {
    importComplete: boolean
    importedResponses: number
    linkedSheetVerified: boolean
    lastSyncedAt: string | null
  }
  status: string
  batchSize: number
  totalCount: number
  processedCount: number
  qualifiedCount: number
  notQualifiedCount: number
  needsReviewCount: number
  currentBatch: number
  taskCounts: {
    pending: number
    processing: number
    retry: number
    failed: number
    completed: number
  }
  lastError: string | null
  createdAt: string
  updatedAt: string
}

type Overview = {
  configured: boolean
  message?: string
  integrations: IntegrationStatus
  jobs: Job[]
  totals: {
    totalApplications: number
    processedApplications: number
    qualified: number
    notQualified: number
    needsReview: number
  }
}

type Assessment = {
  verdict: 'qualified' | 'not_qualified' | 'needs_review'
  total_score: number
  score_breakdown: Record<string, number>
  reason_codes: string[]
  public_reasons: string[]
  requires_human_review: boolean
  policy_version: string
}

type Applicant = {
  id: string
  full_name: string
  primary_email: string | null
  country: string | null
  institution: string | null
  course: string | null
  status: string
  selection_assessments?: Assessment[] | Assessment | null
  selection_documents?: Array<{
    id: string
    original_name: string
    size_bytes: number
    sha256: string | null
    extraction_status: string
    extraction_confidence: number | null
    integrity_flags: string[]
  }>
  selection_public_results?: Array<{
    is_published: boolean
    published_at: string | null
    access_token: string
  }>
}

type SummaryCard = {
  label: string
  value: number
  Icon: IconComponent
}

const emptyOverview: Overview = {
  configured: true,
  integrations: {
    googleWorkspace: false,
    documentAi: false,
    aiMerit: false,
    cronWorker: false,
  },
  jobs: [],
  totals: {
    totalApplications: 0,
    processedApplications: 0,
    qualified: 0,
    notQualified: 0,
    needsReview: 0,
  },
}

const requestJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with HTTP ${response.status}`)
  }
  return payload as T
}

const percentage = (value: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, Math.round((value / total) * 100))) : 0

const assessmentFor = (applicant: Applicant): Assessment | null => {
  if (Array.isArray(applicant.selection_assessments)) {
    return applicant.selection_assessments[0] ?? null
  }
  return applicant.selection_assessments ?? null
}

const verdictStyle = (verdict: Assessment['verdict'] | null) => {
  if (verdict === 'qualified') {
    return {
      label: 'Qualified',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      Icon: CheckCircle2,
    }
  }
  if (verdict === 'not_qualified') {
    return {
      label: 'Not qualified',
      className: 'border-rose-200 bg-rose-50 text-rose-700',
      Icon: XCircle,
    }
  }
  if (verdict === 'needs_review') {
    return {
      label: 'Needs review',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      Icon: AlertCircle,
    }
  }
  return {
    label: 'Not assessed',
    className: 'border-zinc-200 bg-zinc-50 text-zinc-600',
    Icon: Clock3,
  }
}

export default function SelectionEngineClient() {
  const [overview, setOverview] = useState<Overview>(emptyOverview)
  const [loading, setLoading] = useState(true)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [applicantsLoading, setApplicantsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [workerProgress, setWorkerProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [newJob, setNewJob] = useState({
    cycleName: `Top100 Africa Future Leaders ${currentYear}`,
    cycleYear: currentYear,
    sourceType: 'google_form' as 'google_form' | 'pdf_upload',
    sourceLabel: `Top100 ${currentYear} applicants`,
    googleFormUrl: '',
    googleSheetUrl: '',
    minimumMeritScore: 60,
  })

  const [uploadForm, setUploadForm] = useState({
    fullName: '',
    primaryEmail: '',
    phone: '',
    country: '',
    institution: '',
    course: '',
    graduationYear: currentYear,
    claimedCgpa: '',
    claimedAcademicStatus: 'First Class/equivalent claimed',
    leadershipNarrative: '',
    declarationConfirmed: false,
  })
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null)

  const activeJob = useMemo(
    () => overview.jobs.find((job) => job.id === selectedJobId) ?? overview.jobs[0] ?? null,
    [overview.jobs, selectedJobId],
  )

  const summaryCards: SummaryCard[] = useMemo(
    () => [
      { label: 'Applicants', value: overview.totals.totalApplications, Icon: Users },
      { label: 'Processed', value: overview.totals.processedApplications, Icon: FileCheck2 },
      { label: 'Qualified', value: overview.totals.qualified, Icon: CheckCircle2 },
      { label: 'Not qualified', value: overview.totals.notQualified, Icon: XCircle },
      { label: 'Needs review', value: overview.totals.needsReview, Icon: AlertCircle },
    ],
    [overview.totals],
  )

  const loadOverview = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setLoading(true)
      const data = await requestJson<Overview>('/api/admin/selection/overview')
      setOverview(data)
      setSelectedJobId((current) =>
        current && data.jobs.some((job) => job.id === current)
          ? current
          : data.jobs[0]?.id ?? null,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load the Selection Engine'
      setOverview({ ...emptyOverview, configured: false, message })
      if (!silent) toast.error(message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const loadApplicants = useCallback(async () => {
    if (!activeJob) {
      setApplicants([])
      return
    }

    try {
      setApplicantsLoading(true)
      const params = new URLSearchParams({ page: '1', pageSize: '100' })
      if (search.trim()) params.set('search', search.trim())
      const data = await requestJson<{ applications: Applicant[] }>(
        `/api/admin/selection/jobs/${activeJob.id}/applications?${params.toString()}`,
      )
      setApplicants(data.applications)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load applicants')
    } finally {
      setApplicantsLoading(false)
    }
  }, [activeJob, search])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadOverview])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadApplicants()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadApplicants])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadOverview({ silent: true })
      if (activeJob?.status === 'processing') void loadApplicants()
    }, 15_000)
    return () => window.clearInterval(interval)
  }, [activeJob?.status, loadApplicants, loadOverview])

  const refreshAll = async () => {
    await loadOverview({ silent: true })
    await loadApplicants()
  }

  const createJob = async (event: FormEvent) => {
    event.preventDefault()
    setBusyAction('create-job')
    try {
      const data = await requestJson<{ job: { id: string } }>('/api/admin/selection/jobs', {
        method: 'POST',
        body: JSON.stringify(newJob),
      })
      toast.success('Selection job created')
      await loadOverview({ silent: true })
      setSelectedJobId(data.job.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create the selection job')
    } finally {
      setBusyAction(null)
    }
  }

  const syncGoogle = async (job: Job) => {
    setBusyAction(`sync-${job.id}`)
    try {
      const result = await requestJson<{
        importedThisPage: number
        totalImported: number
        importComplete: boolean
        unsupportedEvidenceFiles: number
      }>(`/api/admin/selection/jobs/${job.id}/sync-google`, { method: 'POST' })
      toast.success(
        `Imported ${result.importedThisPage} responses. ${result.totalImported} applicants are linked.`,
      )
      if (result.unsupportedEvidenceFiles > 0) {
        toast.warning(
          `${result.unsupportedEvidenceFiles} non-PDF proof files require manual replacement.`,
        )
      }
      await refreshAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google Form import failed')
    } finally {
      setBusyAction(null)
    }
  }

  const runWorkerLoop = async ({ maximumRuns = 20 }: { maximumRuns?: number } = {}) => {
    setBusyAction('worker')
    let completed = 0
    let retried = 0
    let failed = 0

    try {
      for (let run = 1; run <= maximumRuns; run += 1) {
        setWorkerProgress(`Worker pass ${run} of ${maximumRuns}`)
        const result = await requestJson<{
          claimed: number
          completed: number
          retried: number
          failed: number
        }>('/api/admin/selection/worker', {
          method: 'POST',
          body: JSON.stringify({ limit: 5 }),
        })
        completed += result.completed
        retried += result.retried
        failed += result.failed
        await loadOverview({ silent: true })
        if (result.claimed === 0) break
      }
      toast.success(
        `Processing finished: ${completed} completed, ${retried} retrying, ${failed} sent to review.`,
      )
      await refreshAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The processing worker stopped')
    } finally {
      setWorkerProgress(null)
      setBusyAction(null)
    }
  }

  const startNextBatch = async (job: Job) => {
    setBusyAction(`batch-${job.id}`)
    try {
      const result = await requestJson<{
        batchNumber: number
        enqueuedCount: number
        hasMore: boolean
      }>(`/api/admin/selection/jobs/${job.id}/enqueue`, { method: 'POST' })

      if (result.enqueuedCount === 0) {
        toast.info('No unprocessed applicants remain in this job.')
        await refreshAll()
        return
      }

      toast.success(`Batch ${result.batchNumber} queued with ${result.enqueuedCount} applicants.`)
      await runWorkerLoop({ maximumRuns: 20 })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to queue the next batch')
    } finally {
      setBusyAction(null)
    }
  }

  const uploadApplicant = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeJob) {
      toast.error('Create or select a selection job first.')
      return
    }
    if (!selectedPdf) {
      toast.error('Choose a PDF evidence file.')
      return
    }
    if (
      selectedPdf.type !== 'application/pdf' ||
      !selectedPdf.name.toLowerCase().endsWith('.pdf')
    ) {
      toast.error('Only PDF evidence files are accepted.')
      return
    }
    if (selectedPdf.size > 25 * 1024 * 1024) {
      toast.error('PDF evidence must not exceed 25MB.')
      return
    }

    setBusyAction('upload-applicant')
    try {
      const prepared = await requestJson<{
        application: { id: string }
        document: { id: string }
        upload: { bucket: string; path: string; token: string }
      }>(`/api/admin/selection/jobs/${activeJob.id}/applications`, {
        method: 'POST',
        body: JSON.stringify({
          ...uploadForm,
          fileName: selectedPdf.name,
          fileSize: selectedPdf.size,
          mimeType: selectedPdf.type,
        }),
      })

      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from(prepared.upload.bucket)
        .uploadToSignedUrl(prepared.upload.path, prepared.upload.token, selectedPdf, {
          contentType: 'application/pdf',
        })
      if (uploadError) throw new Error(uploadError.message)

      await requestJson(
        `/api/admin/selection/jobs/${activeJob.id}/applications/${prepared.application.id}/confirm-upload`,
        {
          method: 'POST',
          body: JSON.stringify({ documentId: prepared.document.id }),
        },
      )

      toast.success(`${uploadForm.fullName} was added and the PDF was verified.`)
      setUploadForm({
        fullName: '',
        primaryEmail: '',
        phone: '',
        country: '',
        institution: '',
        course: '',
        graduationYear: currentYear,
        claimedCgpa: '',
        claimedAcademicStatus: 'First Class/equivalent claimed',
        leadershipNarrative: '',
        declarationConfirmed: false,
      })
      setSelectedPdf(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await refreshAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload the applicant PDF')
    } finally {
      setBusyAction(null)
    }
  }

  const publishResult = async (applicant: Applicant) => {
    setBusyAction(`publish-${applicant.id}`)
    try {
      const result = await requestJson<{ resultPath: string }>(
        `/api/admin/selection/applications/${applicant.id}/publish-result`,
        { method: 'POST' },
      )
      const resultUrl = `${window.location.origin}${result.resultPath}`
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(resultUrl).catch(() => undefined)
      }
      toast.success('Result published. The private link was copied to your clipboard.')
      await loadApplicants()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to publish the result')
    } finally {
      setBusyAction(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-orange-100 bg-white">
        <Loader2 className="size-8 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!overview.configured) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-900">
            <AlertCircle className="size-5" /> Selection Engine setup required
          </CardTitle>
          <CardDescription className="text-rose-800">{overview.message}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-rose-800">
          Apply the Selection Engine migrations and configure the server-only integration
          variables documented in the repository.
        </CardContent>
      </Card>
    )
  }

  const integrations = [
    {
      label: 'Google Workspace',
      ready: overview.integrations.googleWorkspace,
      detail: 'Forms, Sheets and Drive',
    },
    {
      label: 'Document AI',
      ready: overview.integrations.documentAi,
      detail: 'PDF OCR and academic extraction',
    },
    {
      label: 'AI merit review',
      ready: overview.integrations.aiMerit,
      detail: 'Optional redacted narrative scoring',
    },
    {
      label: 'Background worker',
      ready: overview.integrations.cronWorker,
      detail: 'Continues while admin is offline',
    },
  ]

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {integrations.map((integration) => (
          <div key={integration.label} className="rounded-[22px] border border-zinc-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-zinc-950">{integration.label}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">{integration.detail}</div>
              </div>
              {integration.ready ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="size-5 shrink-0 text-amber-500" />
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value, Icon }) => (
          <Card key={label} className="border-zinc-200 shadow-none">
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {label}
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums text-zinc-950">
                  {value}
                </div>
              </div>
              <Icon className="size-6 text-orange-500" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start rounded-xl bg-zinc-100 p-1">
          <TabsTrigger value="jobs">Jobs and batches</TabsTrigger>
          <TabsTrigger value="new-job">Connect a source</TabsTrigger>
          <TabsTrigger value="upload">Upload applicant PDF</TabsTrigger>
          <TabsTrigger value="applications">Applications and results</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-5">
          {overview.jobs.length === 0 ? (
            <Card className="border-dashed border-orange-200 bg-orange-50/40">
              <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <Cloud className="size-9 text-orange-500" />
                <div className="text-lg font-semibold text-zinc-950">No selection jobs yet</div>
                <p className="max-w-lg text-sm leading-6 text-zinc-600">
                  Connect a Google Form and its linked response spreadsheet, or create a PDF
                  upload job.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {overview.jobs.map((job) => {
                const progress = percentage(job.processedCount, job.totalCount)
                const activeTasks =
                  job.taskCounts.pending + job.taskCounts.processing + job.taskCounts.retry
                const isSelected = activeJob?.id === job.id

                return (
                  <Card
                    key={job.id}
                    className={
                      isSelected
                        ? 'border-orange-300 ring-2 ring-orange-100'
                        : 'border-zinc-200'
                    }
                  >
                    <CardHeader className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          type="button"
                          className="min-w-0 text-left"
                          onClick={() => setSelectedJobId(job.id)}
                        >
                          <CardTitle className="truncate text-lg">{job.cycleName}</CardTitle>
                          <CardDescription className="mt-1 truncate">
                            {job.sourceLabel}
                          </CardDescription>
                        </button>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                          {job.status}
                        </span>
                      </div>
                      <div>
                        <div className="mb-2 flex justify-between text-xs text-zinc-500">
                          <span>
                            {job.processedCount} of {job.totalCount} processed
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-orange-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                          <strong className="block text-lg">{job.qualifiedCount}</strong>
                          Qualified
                        </div>
                        <div className="rounded-xl bg-rose-50 p-2 text-rose-700">
                          <strong className="block text-lg">{job.notQualifiedCount}</strong>
                          Not qualified
                        </div>
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-700">
                          <strong className="block text-lg">{job.needsReviewCount}</strong>
                          Review
                        </div>
                      </div>

                      {job.lastError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-800">
                          {job.lastError}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {job.sourceType === 'google_form' &&
                          !job.sourceProgress.importComplete && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void syncGoogle(job)}
                              disabled={Boolean(busyAction)}
                            >
                              {busyAction === `sync-${job.id}` ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-2 size-4" />
                              )}
                              Import next 100
                            </Button>
                          )}
                        <Button
                          size="sm"
                          onClick={() => void startNextBatch(job)}
                          disabled={
                            Boolean(busyAction) ||
                            activeTasks > 0 ||
                            job.totalCount <= job.processedCount
                          }
                        >
                          {busyAction === `batch-${job.id}` ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 size-4" />
                          )}
                          Start next 100
                        </Button>
                        {activeTasks > 0 && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void runWorkerLoop()}
                            disabled={Boolean(busyAction)}
                          >
                            <RefreshCw className="mr-2 size-4" /> Process queued ({activeTasks})
                          </Button>
                        )}
                        {job.currentBatch > 0 && (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/api/admin/selection/jobs/${job.id}/reports/${job.currentBatch}`}
                              target="_blank"
                            >
                              <Download className="mr-2 size-4" /> Batch {job.currentBatch} PDF
                            </Link>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedJobId(job.id)
                            void loadApplicants()
                          }}
                        >
                          Applications <ChevronRight className="ml-1 size-4" />
                        </Button>
                      </div>
                      {workerProgress && isSelected && (
                        <div className="flex items-center gap-2 text-xs text-orange-700">
                          <Loader2 className="size-3.5 animate-spin" />
                          {workerProgress}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="new-job">
          <Card className="max-w-4xl border-zinc-200">
            <CardHeader>
              <CardTitle>Connect applicants</CardTitle>
              <CardDescription>
                Paste the owner/editor Form URL and its linked response spreadsheet. The
                engine verifies that they belong together before importing 100 responses at a
                time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5 sm:grid-cols-2" onSubmit={createJob}>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cycle-name">Selection cycle</Label>
                  <Input
                    id="cycle-name"
                    value={newJob.cycleName}
                    onChange={(event) =>
                      setNewJob((value) => ({ ...value, cycleName: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cycle-year">Year</Label>
                  <Input
                    id="cycle-year"
                    type="number"
                    min={2000}
                    max={2200}
                    value={newJob.cycleYear}
                    onChange={(event) =>
                      setNewJob((value) => ({ ...value, cycleYear: Number(event.target.value) }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source-type">Source</Label>
                  <select
                    id="source-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newJob.sourceType}
                    onChange={(event) =>
                      setNewJob((value) => ({
                        ...value,
                        sourceType: event.target.value as 'google_form' | 'pdf_upload',
                      }))
                    }
                  >
                    <option value="google_form">Google Form + linked Sheet</option>
                    <option value="pdf_upload">Admin PDF uploads</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="source-label">Internal source label</Label>
                  <Input
                    id="source-label"
                    value={newJob.sourceLabel}
                    onChange={(event) =>
                      setNewJob((value) => ({ ...value, sourceLabel: event.target.value }))
                    }
                    required
                  />
                </div>
                {newJob.sourceType === 'google_form' && (
                  <>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="form-url">Google Form owner/editor URL</Label>
                      <Input
                        id="form-url"
                        type="url"
                        placeholder="https://docs.google.com/forms/d/.../edit"
                        value={newJob.googleFormUrl}
                        onChange={(event) =>
                          setNewJob((value) => ({ ...value, googleFormUrl: event.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="sheet-url">Linked response spreadsheet URL</Label>
                      <Input
                        id="sheet-url"
                        type="url"
                        placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                        value={newJob.googleSheetUrl}
                        onChange={(event) =>
                          setNewJob((value) => ({ ...value, googleSheetUrl: event.target.value }))
                        }
                        required
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="threshold">Minimum merit score</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min={0}
                    max={100}
                    value={newJob.minimumMeritScore}
                    onChange={(event) =>
                      setNewJob((value) => ({
                        ...value,
                        minimumMeritScore: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <Button className="w-full sm:w-auto" disabled={busyAction === 'create-job'}>
                    {busyAction === 'create-job' ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Cloud className="mr-2 size-4" />
                    )}
                    Create selection job
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card className="max-w-5xl border-zinc-200">
            <CardHeader>
              <CardTitle>Upload one applicant and academic PDF</CardTitle>
              <CardDescription>
                The browser uploads directly to private storage. The server verifies the PDF
                signature and creates a SHA-256 fingerprint before batching.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!activeJob ? (
                <p className="text-sm text-zinc-600">
                  Create a selection job before uploading applicants.
                </p>
              ) : (
                <form className="grid gap-5 sm:grid-cols-2" onSubmit={uploadApplicant}>
                  <div className="space-y-2">
                    <Label>Selected job</Label>
                    <div className="rounded-md border bg-zinc-50 px-3 py-2 text-sm">
                      {activeJob.cycleName} — {activeJob.sourceLabel}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pdf">Academic evidence PDF</Label>
                    <Input
                      ref={fileInputRef}
                      id="pdf"
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => setSelectedPdf(event.target.files?.[0] ?? null)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full name</Label>
                    <Input
                      id="full-name"
                      value={uploadForm.fullName}
                      onChange={(event) =>
                        setUploadForm((value) => ({ ...value, fullName: event.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="app-email">Email</Label>
                    <Input
                      id="app-email"
                      type="email"
                      value={uploadForm.primaryEmail}
                      onChange={(event) =>
                        setUploadForm((value) => ({ ...value, primaryEmail: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={uploadForm.country}
                      onChange={(event) =>
                        setUploadForm((value) => ({ ...value, country: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution</Label>
                    <Input
                      id="institution"
                      value={uploadForm.institution}
                      onChange={(event) =>
                        setUploadForm((value) => ({ ...value, institution: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course">Course or department</Label>
                    <Input
                      id="course"
                      value={uploadForm.course}
                      onChange={(event) =>
                        setUploadForm((value) => ({ ...value, course: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grad-year">Graduation year</Label>
                    <Input
                      id="grad-year"
                      type="number"
                      value={uploadForm.graduationYear}
                      onChange={(event) =>
                        setUploadForm((value) => ({
                          ...value,
                          graduationYear: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cgpa">Claimed CGPA</Label>
                    <Input
                      id="cgpa"
                      value={uploadForm.claimedCgpa}
                      onChange={(event) =>
                        setUploadForm((value) => ({ ...value, claimedCgpa: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academic-status">Claimed academic status</Label>
                    <Input
                      id="academic-status"
                      value={uploadForm.claimedAcademicStatus}
                      onChange={(event) =>
                        setUploadForm((value) => ({
                          ...value,
                          claimedAcademicStatus: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="leadership">Leadership roles and measurable impact</Label>
                    <Textarea
                      id="leadership"
                      rows={6}
                      value={uploadForm.leadershipNarrative}
                      onChange={(event) =>
                        setUploadForm((value) => ({
                          ...value,
                          leadershipNarrative: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <label className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={uploadForm.declarationConfirmed}
                      onChange={(event) =>
                        setUploadForm((value) => ({
                          ...value,
                          declarationConfirmed: event.target.checked,
                        }))
                      }
                    />
                    <span>The applicant confirmed that the submitted information is accurate.</span>
                  </label>
                  <div className="sm:col-span-2">
                    <Button disabled={busyAction === 'upload-applicant'}>
                      {busyAction === 'upload-applicant' ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 size-4" />
                      )}
                      Upload and verify applicant
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">
                {activeJob?.cycleName ?? 'Applications'}
              </h2>
              <p className="text-sm text-zinc-500">
                Only applicant-safe reasons can be published. Integrity signals remain internal.
              </p>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search name, email, country or school"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {applicantsLoading ? (
            <div className="flex min-h-52 items-center justify-center rounded-2xl border bg-white">
              <Loader2 className="size-7 animate-spin text-orange-500" />
            </div>
          ) : applicants.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-zinc-500">
              No applicants match this job and search.
            </div>
          ) : (
            <div className="space-y-3">
              {applicants.map((applicant) => {
                const assessment = assessmentFor(applicant)
                const style = verdictStyle(assessment?.verdict ?? null)
                const VerdictIcon = style.Icon
                const publicResult = applicant.selection_public_results?.[0]

                return (
                  <details
                    key={applicant.id}
                    className="group rounded-[22px] border border-zinc-200 bg-white"
                  >
                    <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-zinc-950">
                          {applicant.full_name}
                        </div>
                        <div className="mt-1 truncate text-xs text-zinc-500">
                          {[applicant.country, applicant.institution, applicant.primary_email]
                            .filter(Boolean)
                            .join(' · ') || 'Applicant details incomplete'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.className}`}
                        >
                          <VerdictIcon className="size-3.5" />
                          {style.label}
                        </span>
                        {assessment && (
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-zinc-700">
                            {assessment.total_score}/100
                          </span>
                        )}
                        {publicResult?.is_published && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Result published
                          </span>
                        )}
                        <ChevronRight className="size-4 text-zinc-400 transition group-open:rotate-90" />
                      </div>
                    </summary>
                    <div className="border-t border-zinc-100 p-4 sm:p-5">
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-950">
                            Applicant-facing explanation
                          </h3>
                          <div className="mt-3 space-y-2">
                            {(
                              assessment?.public_reasons ?? [
                                'A final explanation is not available yet.',
                              ]
                            ).map((reason) => (
                              <div
                                key={reason}
                                className="rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-700"
                              >
                                {reason}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-950">
                            Evidence processing
                          </h3>
                          <div className="mt-3 space-y-2">
                            {(applicant.selection_documents ?? []).map((document) => (
                              <div
                                key={document.id}
                                className="rounded-xl border border-zinc-100 p-3 text-xs leading-5 text-zinc-600"
                              >
                                <div className="font-semibold text-zinc-900">
                                  {document.original_name}
                                </div>
                                <div>
                                  Status: {document.extraction_status}
                                  {document.extraction_confidence != null
                                    ? ` · confidence ${document.extraction_confidence}%`
                                    : ''}
                                </div>
                                <div>
                                  Fingerprint:{' '}
                                  {document.sha256
                                    ? `${document.sha256.slice(0, 12)}…`
                                    : 'pending'}
                                </div>
                                {document.integrity_flags?.length > 0 && (
                                  <div className="mt-1 text-amber-700">
                                    Internal flags: {document.integrity_flags.join(', ')}
                                  </div>
                                )}
                              </div>
                            ))}
                            {(applicant.selection_documents ?? []).length === 0 && (
                              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                                No supported academic PDF was attached.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {assessment &&
                          !assessment.requires_human_review &&
                          assessment.verdict !== 'needs_review' &&
                          !publicResult?.is_published && (
                            <Button
                              size="sm"
                              onClick={() => void publishResult(applicant)}
                              disabled={busyAction === `publish-${applicant.id}`}
                            >
                              {busyAction === `publish-${applicant.id}` ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : (
                                <ShieldCheck className="mr-2 size-4" />
                              )}
                              Publish private result link
                            </Button>
                          )}
                        {publicResult?.is_published && (
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/selection-results/${publicResult.access_token}`}
                              target="_blank"
                            >
                              Open published result
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-5 text-sm leading-6 text-orange-950">
        <strong>Selection safeguard:</strong> visual or template differences never cause automatic
        rejection. Unreadable evidence, conflicting data, exact duplicates, unsupported file
        types, and uncertain AI output are routed to human review.
      </div>
    </div>
  )
}
