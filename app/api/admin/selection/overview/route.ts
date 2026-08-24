import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isMissingSelectionSchema = (error: { code?: string; message?: string } | null) =>
  error?.code === '42P01' || Boolean(error?.message?.includes('selection_'))

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const [
    { data: cycles, error: cyclesError },
    { data: jobs, error: jobsError },
    { data: tasks, error: tasksError },
  ] = await Promise.all([
    supabase
      .from('selection_cycles')
      .select(
        'id, name, slug, year, status, policy, applications_open_at, applications_close_at, evidence_freeze_at, appeal_deadline_at, created_at, updated_at',
      )
      .order('year', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('selection_jobs')
      .select(
        'id, cycle_id, source_type, source_label, source_config, status, batch_size, total_count, processed_count, qualified_count, not_qualified_count, needs_review_count, current_batch, last_error, created_at, updated_at, selection_cycles(name, year)',
      )
      .order('updated_at', { ascending: false })
      .limit(50),
    supabase
      .from('selection_processing_tasks')
      .select('job_id, status, logical_batch_number'),
  ])

  if (
    isMissingSelectionSchema(cyclesError) ||
    isMissingSelectionSchema(jobsError) ||
    isMissingSelectionSchema(tasksError)
  ) {
    return NextResponse.json(
      {
        configured: false,
        message: 'Apply the Selection Engine Supabase migrations before using this admin workspace.',
        cycles: [],
        jobs: [],
      },
      { status: 503 },
    )
  }

  if (cyclesError || jobsError || tasksError) {
    return NextResponse.json(
      {
        configured: false,
        message:
          cyclesError?.message ||
          jobsError?.message ||
          tasksError?.message ||
          'Failed to load the Selection Engine.',
      },
      { status: 500 },
    )
  }

  const taskSummary = new Map<
    string,
    { pending: number; processing: number; retry: number; failed: number; completed: number }
  >()
  for (const task of tasks ?? []) {
    const summary = taskSummary.get(task.job_id) ?? {
      pending: 0,
      processing: 0,
      retry: 0,
      failed: 0,
      completed: 0,
    }
    if (task.status in summary) {
      summary[task.status as keyof typeof summary] += 1
    }
    taskSummary.set(task.job_id, summary)
  }

  const normalizedJobs = (jobs ?? []).map((job: any) => {
    const cycle = Array.isArray(job.selection_cycles)
      ? job.selection_cycles[0] ?? null
      : job.selection_cycles
    const sourceConfig = job.source_config && typeof job.source_config === 'object'
      ? job.source_config
      : {}
    const taskCounts = taskSummary.get(job.id) ?? {
      pending: 0,
      processing: 0,
      retry: 0,
      failed: 0,
      completed: 0,
    }

    return {
      id: job.id,
      cycleId: job.cycle_id,
      cycleName: cycle?.name ?? 'Selection cycle',
      cycleYear: cycle?.year ?? null,
      sourceType: job.source_type,
      sourceLabel: job.source_label,
      sourceProgress: {
        importComplete: Boolean(sourceConfig.importComplete),
        importedResponses: Number(sourceConfig.importedResponses ?? job.total_count ?? 0),
        linkedSheetVerified: Boolean(sourceConfig.linkedSheetVerified),
        lastSyncedAt: sourceConfig.lastSyncedAt ?? null,
      },
      status: job.status,
      batchSize: job.batch_size,
      totalCount: job.total_count,
      processedCount: job.processed_count,
      qualifiedCount: job.qualified_count,
      notQualifiedCount: job.not_qualified_count,
      needsReviewCount: job.needs_review_count,
      currentBatch: job.current_batch,
      taskCounts,
      lastError: job.last_error,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
    }
  })

  const totals = normalizedJobs.reduce(
    (summary, job) => ({
      totalApplications: summary.totalApplications + job.totalCount,
      processedApplications: summary.processedApplications + job.processedCount,
      qualified: summary.qualified + job.qualifiedCount,
      notQualified: summary.notQualified + job.notQualifiedCount,
      needsReview: summary.needsReview + job.needsReviewCount,
    }),
    {
      totalApplications: 0,
      processedApplications: 0,
      qualified: 0,
      notQualified: 0,
      needsReview: 0,
    },
  )

  return NextResponse.json({
    configured: true,
    integrations: {
      googleWorkspace:
        Boolean(process.env.GOOGLE_SELECTION_SERVICE_ACCOUNT_EMAIL?.trim()) &&
        Boolean(process.env.GOOGLE_SELECTION_SERVICE_ACCOUNT_PRIVATE_KEY?.trim()),
      documentAi:
        Boolean(process.env.GOOGLE_DOCUMENT_AI_PROJECT_ID?.trim()) &&
        Boolean(process.env.GOOGLE_DOCUMENT_AI_LOCATION?.trim()) &&
        Boolean(process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID?.trim()),
      aiMerit: Boolean(process.env.OPENAI_API_KEY?.trim()),
      cronWorker: Boolean(process.env.CRON_SECRET?.trim()),
    },
    cycles: cycles ?? [],
    jobs: normalizedJobs,
    totals,
  })
}
