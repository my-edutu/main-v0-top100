import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import type { SelectionReport, SelectionVerdict } from '@/lib/selection/contracts'
import { generateSelectionReportPdf } from '@/lib/selection/report/pdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ jobId: string; batchNumber: string }>
}

const safeFilename = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'selection-report'

export async function GET(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { jobId, batchNumber: rawBatchNumber } = await params
  const batchNumber = Number.parseInt(rawBatchNumber, 10)
  if (!Number.isInteger(batchNumber) || batchNumber < 1) {
    return NextResponse.json({ message: 'batchNumber must be a positive integer' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: job, error: jobError } = await supabase
    .from('selection_jobs')
    .select('id, source_label, total_count, current_batch, selection_cycles(name)')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ message: 'Selection job not found' }, { status: 404 })
  }

  const { data: tasks, error: tasksError } = await supabase
    .from('selection_processing_tasks')
    .select('application_id, status')
    .eq('job_id', jobId)
    .eq('logical_batch_number', batchNumber)
    .order('created_at', { ascending: true })

  if (tasksError) return NextResponse.json({ message: tasksError.message }, { status: 500 })
  if (!tasks?.length) {
    return NextResponse.json({ message: 'No applications were found for this batch' }, { status: 404 })
  }

  const applicationIds = tasks.map((task: any) => task.application_id)
  const [{ data: applications, error: applicationsError }, { data: assessments, error: assessmentsError }] =
    await Promise.all([
      supabase
        .from('selection_applications')
        .select('id, full_name, country')
        .in('id', applicationIds),
      supabase
        .from('selection_assessments')
        .select('application_id, verdict, total_score, public_reasons, created_at')
        .eq('job_id', jobId)
        .in('application_id', applicationIds)
        .order('created_at', { ascending: false }),
    ])

  if (applicationsError || assessmentsError) {
    return NextResponse.json(
      { message: applicationsError?.message || assessmentsError?.message || 'Failed to build the report' },
      { status: 500 },
    )
  }

  const applicationMap = new Map((applications ?? []).map((application: any) => [application.id, application]))
  const assessmentMap = new Map<string, any>()
  for (const assessment of assessments ?? []) {
    if (!assessmentMap.has(assessment.application_id)) {
      assessmentMap.set(assessment.application_id, assessment)
    }
  }

  const reportApplications = applicationIds.map((applicationId: string) => {
    const application = applicationMap.get(applicationId)
    const assessment = assessmentMap.get(applicationId)
    return {
      applicationId,
      fullName: application?.full_name ?? 'Unknown applicant',
      country: application?.country ?? null,
      verdict: (assessment?.verdict ?? 'needs_review') as SelectionVerdict,
      totalScore: Number(assessment?.total_score ?? 0),
      publicReasons:
        assessment?.public_reasons?.length > 0
          ? assessment.public_reasons
          : ['Processing is not complete, so a final decision is not yet available.'],
    }
  })

  const cycle = Array.isArray(job.selection_cycles)
    ? job.selection_cycles[0] ?? null
    : job.selection_cycles
  const totalBatches = Math.max(Number(job.current_batch || 0), Math.ceil(Number(job.total_count || 0) / 100))
  const report: SelectionReport = {
    title: `Top100 Selection Engine — Batch ${batchNumber} Report`,
    generatedAt: new Date().toISOString(),
    cycleName: cycle?.name ?? 'Top100 Africa Future Leaders',
    sourceLabel: job.source_label,
    summary: {
      totalApplications: Number(job.total_count || 0),
      processedApplications: reportApplications.filter(
        (application) => assessmentMap.has(application.applicationId),
      ).length,
      qualified: reportApplications.filter((application) => application.verdict === 'qualified').length,
      notQualified: reportApplications.filter((application) => application.verdict === 'not_qualified').length,
      needsReview: reportApplications.filter((application) => application.verdict === 'needs_review').length,
      batchNumber,
      totalBatches: Math.max(batchNumber, totalBatches),
    },
    applications: reportApplications,
  }

  const pdf = generateSelectionReportPdf(report)
  const filename = `${safeFilename(report.cycleName)}-batch-${batchNumber}-report.pdf`

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  })
}
