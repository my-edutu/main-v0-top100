'use client'

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ListOrdered,
  Loader2,
  RefreshCw,
  Trophy,
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
import RankingRunDetails from './ranking-run-details'
import type {
  RankingApproval,
  RankingDetails,
  RankingRun,
  SelectionOverview,
} from './ranking-types'
import { requestJson, statusStyle } from './ranking-types'

export default function RankingWorkspace() {
  const [jobs, setJobs] = useState<SelectionOverview['jobs']>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [runs, setRuns] = useState<RankingRun[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [details, setDetails] = useState<RankingDetails | null>(null)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [rankingName, setRankingName] = useState('')
  const [winnerTarget, setWinnerTarget] = useState(100)
  const [reserveTarget, setReserveTarget] = useState(20)
  const [approvalNotes, setApprovalNotes] = useState('')

  const cycles = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; year: number | null }>()
    for (const job of jobs) {
      if (!byId.has(job.cycleId)) {
        byId.set(job.cycleId, {
          id: job.cycleId,
          name: job.cycleName,
          year: job.cycleYear,
        })
      }
    }
    return Array.from(byId.values()).sort((left, right) =>
      right.year !== left.year
        ? (right.year ?? 0) - (left.year ?? 0)
        : left.name.localeCompare(right.name),
    )
  }, [jobs])

  const cycleId = selectedCycleId
  const cycleName = cycles.find((cycle) => cycle.id === cycleId)?.name ?? null
  const cycleJobs = useMemo(
    () => jobs.filter((job) => job.cycleId === cycleId),
    [cycleId, jobs],
  )
  const readiness = useMemo(() => {
    const totalApplications = cycleJobs.reduce((sum, job) => sum + job.totalCount, 0)
    const activeTasks = cycleJobs.reduce(
      (sum, job) =>
        sum + job.taskCounts.pending + job.taskCounts.processing + job.taskCounts.retry,
      0,
    )
    const incompleteJobs = cycleJobs.filter(
      (job) =>
        job.processedCount < job.totalCount ||
        ['draft', 'processing', 'paused', 'failed'].includes(job.status),
    ).length
    const unresolved = cycleJobs.reduce((sum, job) => sum + job.needsReviewCount, 0)
    return {
      ready:
        cycleJobs.length > 0 &&
        totalApplications > 0 &&
        activeTasks === 0 &&
        incompleteJobs === 0 &&
        unresolved === 0,
      totalApplications,
      activeTasks,
      incompleteJobs,
      unresolved,
    }
  }, [cycleJobs])

  const loadOverview = useCallback(async () => {
    try {
      setLoadingOverview(true)
      const data = await requestJson<SelectionOverview>('/api/admin/selection/overview')
      if (!data.configured) {
        throw new Error(data.message || 'The Selection Engine is not configured.')
      }
      setJobs(data.jobs)
      const available = new Set(data.jobs.map((job) => job.cycleId))
      setSelectedCycleId((current) =>
        current && available.has(current) ? current : data.jobs[0]?.cycleId ?? null,
      )
      if (data.jobs.length === 0) {
        setRuns([])
        setSelectedRunId(null)
        setDetails(null)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load selection cycles')
    } finally {
      setLoadingOverview(false)
    }
  }, [])

  const loadRuns = useCallback(async () => {
    if (!cycleId) {
      setRuns([])
      setSelectedRunId(null)
      setDetails(null)
      return
    }
    try {
      setLoadingRuns(true)
      const data = await requestJson<{ runs: RankingRun[] }>(
        `/api/admin/selection/rankings?cycleId=${encodeURIComponent(cycleId)}`,
      )
      setRuns(data.runs)
      if (data.runs.length === 0) {
        setSelectedRunId(null)
        setDetails(null)
        return
      }
      setSelectedRunId((current) =>
        current && data.runs.some((run) => run.id === current)
          ? current
          : data.runs[0].id,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load ranking runs')
    } finally {
      setLoadingRuns(false)
    }
  }, [cycleId])

  const loadDetails = useCallback(async (runId: string, page = 1) => {
    try {
      setLoadingDetails(true)
      const data = await requestJson<RankingDetails>(
        `/api/admin/selection/rankings/${runId}?page=${page}&pageSize=100`,
      )
      setDetails(data)
      setSelectedRunId(runId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load ranked applicants')
    } finally {
      setLoadingDetails(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOverview(), 0)
    return () => window.clearTimeout(timer)
  }, [loadOverview])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRuns(), 0)
    return () => window.clearTimeout(timer)
  }, [loadRuns])

  useEffect(() => {
    if (!selectedRunId) return
    const timer = window.setTimeout(() => void loadDetails(selectedRunId), 0)
    return () => window.clearTimeout(timer)
  }, [loadDetails, selectedRunId])

  const createRanking = async (event: FormEvent) => {
    event.preventDefault()
    if (!cycleId || !readiness.ready) {
      toast.error('Finish processing and human review before freezing a ranking.')
      return
    }
    setBusyAction('create-ranking')
    try {
      const result = await requestJson<{ runId: string; checksum: string }>(
        '/api/admin/selection/rankings',
        {
          method: 'POST',
          body: JSON.stringify({
            cycleId,
            name: rankingName.trim() || `${cycleName ?? 'Selection cycle'} final ranking`,
            winnerTarget,
            reserveTarget,
          }),
        },
      )
      toast.success(`Ranking frozen with checksum ${result.checksum.slice(0, 12)}…`)
      setRankingName('')
      await loadRuns()
      await loadDetails(result.runId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to freeze the ranking')
    } finally {
      setBusyAction(null)
    }
  }

  const recordDecision = async (decision: RankingApproval['decision']) => {
    if (!selectedRunId) return
    if (approvalNotes.trim().length < 10) {
      toast.error('Add a committee note of at least 10 characters.')
      return
    }
    setBusyAction(`${decision}-${selectedRunId}`)
    try {
      const result = await requestJson<{ message: string }>(
        `/api/admin/selection/rankings/${selectedRunId}/approvals`,
        {
          method: 'POST',
          body: JSON.stringify({ decision, notes: approvalNotes }),
        },
      )
      toast.success(result.message)
      setApprovalNotes('')
      await loadRuns()
      await loadDetails(selectedRunId, details?.pagination.page ?? 1)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record the decision')
    } finally {
      setBusyAction(null)
    }
  }

  if (loadingOverview && jobs.length === 0) {
    return (
      <Card className="border-zinc-200">
        <CardContent className="flex min-h-52 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    )
  }

  if (!cycleId) {
    return (
      <Card className="border-dashed border-zinc-200">
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
          <ListOrdered className="size-9 text-zinc-400" />
          <div className="font-semibold text-zinc-950">No selection cycle is ready</div>
          <p className="max-w-lg text-sm leading-6 text-zinc-500">
            Create an applicant intake job before opening the ranking and committee workspace.
          </p>
          <Button variant="outline" onClick={() => void loadOverview()}>
            <RefreshCw className="mr-2 size-4" /> Refresh cycles
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="border-zinc-200">
        <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="ranking-cycle">Selection cycle</Label>
            <select
              id="ranking-cycle"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={cycleId}
              onChange={(event) => {
                setSelectedCycleId(event.target.value)
                setSelectedRunId(null)
                setDetails(null)
              }}
            >
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                  {cycle.year ? ` (${cycle.year})` : ''}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadOverview()}
            disabled={loadingOverview}
          >
            {loadingOverview ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Refresh cycle data
          </Button>
        </CardContent>
      </Card>

      <Card className={readiness.ready ? 'border-emerald-200' : 'border-amber-200'}>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            {readiness.ready ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            )}
            <div>
              <div className="font-semibold text-zinc-950">
                {readiness.ready ? 'Cycle ready to rank' : 'Ranking is locked'}
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {readiness.ready
                  ? `${readiness.totalApplications} applications have final assessments and no unresolved worker tasks.`
                  : `${readiness.incompleteJobs} incomplete job(s), ${readiness.activeTasks} active task(s), and ${readiness.unresolved} application(s) still needing review.`}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void loadRuns()} disabled={loadingRuns}>
            {loadingRuns ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Refresh rankings
          </Button>
        </CardContent>
      </Card>

      <Card className="border-zinc-200">
        <CardHeader>
          <CardTitle>Freeze a reproducible ranking</CardTitle>
          <CardDescription>
            The current policy and deterministic tie-breakers produce an immutable order and
            SHA-256 checksum.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={createRanking}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ranking-name">Ranking name</Label>
              <Input
                id="ranking-name"
                placeholder={`${cycleName ?? 'Selection cycle'} final ranking`}
                value={rankingName}
                onChange={(event) => setRankingName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="winner-target">Winner target</Label>
              <Input
                id="winner-target"
                type="number"
                min={1}
                max={10_000}
                value={winnerTarget}
                onChange={(event) => setWinnerTarget(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reserve-target">Reserve target</Label>
              <Input
                id="reserve-target"
                type="number"
                min={0}
                max={10_000}
                value={reserveTarget}
                onChange={(event) => setReserveTarget(Number(event.target.value))}
              />
            </div>
            <div className="md:col-span-4">
              <Button disabled={!readiness.ready || busyAction === 'create-ranking'}>
                {busyAction === 'create-ranking' ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Trophy className="mr-2 size-4" />
                )}
                Freeze ranking snapshot
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle>Ranking runs</CardTitle>
            <CardDescription>Open a frozen run to inspect names and approvals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRuns && runs.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-orange-500" />
              </div>
            ) : runs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-5 text-sm leading-6 text-zinc-500">
                No ranking snapshot has been frozen for this cycle.
              </div>
            ) : (
              runs.map((run) => {
                const approvals = run.selection_ranking_approvals ?? []
                const approvalCount = approvals.filter(
                  (approval) => approval.decision === 'approve',
                ).length
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      run.id === selectedRunId
                        ? 'border-orange-300 bg-orange-50/60 ring-2 ring-orange-100'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-zinc-950">{run.name}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {run.proposed_winner_count} winners · {run.reserve_count} reserves
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusStyle(run.status)}`}
                      >
                        {run.status}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-zinc-600">
                      {approvalCount}/2 approvals · {run.countries_represented} countries
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <RankingRunDetails
          details={details}
          loading={loadingDetails}
          busyAction={busyAction}
          approvalNotes={approvalNotes}
          onApprovalNotesChange={setApprovalNotes}
          onDecision={(decision) => void recordDecision(decision)}
          onPage={(page) => details && void loadDetails(details.run.id, page)}
        />
      </div>
    </div>
  )
}
