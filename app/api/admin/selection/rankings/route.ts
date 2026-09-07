import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import type { SelectionAssessment, SelectionPolicy } from '@/lib/selection/contracts'
import { buildSelectionRankingSnapshot } from '@/lib/selection/ranking-run'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const createRankingSchema = z.object({
  cycleId: z.string().uuid(),
  name: z.string().trim().min(3).max(180),
  winnerTarget: z.number().int().min(1).max(10_000).optional().default(100),
  reserveTarget: z.number().int().min(0).max(10_000).optional().default(20),
})

const defaultPolicy: SelectionPolicy = {
  minimumMeritScore: 60,
  academicRequirement: 'first_class_or_equivalent',
  requireVerifiedAcademicEvidence: true,
  version: '2026.1',
}

type RankingJobRow = {
  id: string
  status: string
  total_count: number
  processed_count: number
  needs_review_count: number
}

type RankingAssessmentRow = {
  id: string
  verdict: SelectionAssessment['verdict']
  total_score: number | string
  score_breakdown: unknown
  reason_codes: SelectionAssessment['reasonCodes'] | null
  internal_reasons: string[] | null
  public_reasons: string[] | null
  requires_human_review: boolean
  policy_version: string
  updated_at: string
}

type RankingApplicationRow = {
  id: string
  full_name: string
  country: string | null
  status: string
  selection_assessments: RankingAssessmentRow | RankingAssessmentRow[] | null
}

const parsePolicy = (value: unknown): SelectionPolicy => {
  if (!value || typeof value !== 'object') return defaultPolicy
  const policy = value as Partial<SelectionPolicy>
  return {
    minimumMeritScore:
      typeof policy.minimumMeritScore === 'number' &&
      policy.minimumMeritScore >= 0 &&
      policy.minimumMeritScore <= 100
        ? policy.minimumMeritScore
        : defaultPolicy.minimumMeritScore,
    academicRequirement: 'first_class_or_equivalent',
    requireVerifiedAcademicEvidence:
      typeof policy.requireVerifiedAcademicEvidence === 'boolean'
        ? policy.requireVerifiedAcademicEvidence
        : true,
    version:
      typeof policy.version === 'string' && policy.version.trim()
        ? policy.version.trim()
        : defaultPolicy.version,
  }
}

const toScoreBreakdown = (value: unknown) => {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const score = (key: string) => {
    const raw = record[key]
    const number = typeof raw === 'number' ? raw : Number(raw ?? 0)
    return Number.isFinite(number) ? number : 0
  }

  return {
    academic: score('academic'),
    leadership: score('leadership'),
    impact: score('impact'),
    initiative: score('initiative'),
    communication: score('communication'),
  }
}

const normalizeAssessment = ({
  application,
  assessment,
}: {
  application: RankingApplicationRow
  assessment: RankingAssessmentRow
}): SelectionAssessment => ({
  applicationId: application.id,
  fullName: application.full_name,
  country: application.country,
  verdict: assessment.verdict,
  totalScore: Number(assessment.total_score),
  scoreBreakdown: toScoreBreakdown(assessment.score_breakdown),
  reasonCodes: assessment.reason_codes ?? [],
  internalReasons: assessment.internal_reasons ?? [],
  publicReasons: assessment.public_reasons ?? [],
  requiresHumanReview: Boolean(assessment.requires_human_review),
  policyVersion: assessment.policy_version,
})

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { searchParams } = new URL(request.url)
  const cycleId = searchParams.get('cycleId')?.trim() || null
  const supabase = createAdminClient()
  let query = supabase
    .from('selection_ranking_runs')
    .select(
      'id, cycle_id, name, policy_version, status, winner_target, reserve_target, eligible_count, proposed_winner_count, reserve_count, countries_represented, input_checksum, ranking_method, frozen_at, approved_at, published_at, created_at, updated_at, selection_cycles(name, year), selection_ranking_approvals(id, approver_id, decision, notes, created_at)',
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (cycleId) query = query.eq('cycle_id', cycleId)
  const { data, error } = await query
  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  return NextResponse.json({ runs: data ?? [] })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let input: z.infer<typeof createRankingSchema>
  try {
    input = createRankingSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Invalid ranking run details',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const [{ data: cycle, error: cycleError }, { data: jobs, error: jobsError }] =
    await Promise.all([
      supabase
        .from('selection_cycles')
        .select('id, name, policy')
        .eq('id', input.cycleId)
        .single(),
      supabase
        .from('selection_jobs')
        .select('id, status, total_count, processed_count, needs_review_count')
        .eq('cycle_id', input.cycleId),
    ])

  if (cycleError || !cycle) {
    return NextResponse.json({ message: 'Selection cycle not found' }, { status: 404 })
  }
  if (jobsError) return NextResponse.json({ message: jobsError.message }, { status: 500 })
  const typedJobs = (jobs ?? []) as RankingJobRow[]
  if (!typedJobs.length) {
    return NextResponse.json(
      { message: 'The selection cycle has no applicant processing jobs.' },
      { status: 409 },
    )
  }

  const incompleteJobs = typedJobs.filter(
    (job) =>
      Number(job.processed_count) < Number(job.total_count) ||
      ['draft', 'processing', 'paused', 'failed'].includes(job.status),
  )
  if (incompleteJobs.length > 0) {
    return NextResponse.json(
      {
        message: 'Every applicant job must finish before a ranking snapshot can be frozen.',
        incompleteJobIds: incompleteJobs.map((job) => job.id),
      },
      { status: 409 },
    )
  }

  const { data: applications, error: applicationsError } = await supabase
    .from('selection_applications')
    .select(
      'id, full_name, country, status, selection_assessments(id, verdict, total_score, score_breakdown, reason_codes, internal_reasons, public_reasons, requires_human_review, policy_version, updated_at)',
    )
    .eq('cycle_id', input.cycleId)
    .order('created_at', { ascending: true })

  if (applicationsError) {
    return NextResponse.json({ message: applicationsError.message }, { status: 500 })
  }

  const policy = parsePolicy(cycle.policy)
  const unresolved: string[] = []
  const assessments: SelectionAssessment[] = []
  const assessmentIds = new Map<string, string>()

  for (const application of (applications ?? []) as RankingApplicationRow[]) {
    const candidates = Array.isArray(application.selection_assessments)
      ? application.selection_assessments
      : application.selection_assessments
        ? [application.selection_assessments]
        : []
    const assessment = candidates.find(
      (candidate) => candidate.policy_version === policy.version,
    )

    if (
      !assessment ||
      application.status === 'review_required' ||
      assessment.requires_human_review ||
      assessment.verdict === 'needs_review'
    ) {
      unresolved.push(application.id)
      continue
    }

    assessments.push(normalizeAssessment({ application, assessment }))
    assessmentIds.set(application.id, assessment.id)
  }

  if (unresolved.length > 0) {
    return NextResponse.json(
      {
        message: 'Every application must have a final assessment under the current policy before ranking.',
        unresolvedApplicationIds: unresolved.slice(0, 100),
        unresolvedCount: unresolved.length,
      },
      { status: 409 },
    )
  }

  let snapshot
  try {
    snapshot = buildSelectionRankingSnapshot({
      cycleId: input.cycleId,
      policyVersion: policy.version,
      winnerTarget: input.winnerTarget,
      reserveTarget: input.reserveTarget,
      assessments,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to build ranking snapshot' },
      { status: 400 },
    )
  }

  const entries = snapshot.entries.map((entry) => ({
    application_id: entry.applicationId,
    assessment_id: assessmentIds.get(entry.applicationId),
    country: entry.country,
    overall_rank: entry.overallRank,
    country_rank: entry.countryRank,
    total_score: entry.totalScore,
    score_breakdown: entry.scoreBreakdown,
    selection_status: entry.selectionStatus,
    rank_explanation: {
      method: 'merit_only',
      countryAffectsMerit: false,
      tieBreakers: [
        'totalScore',
        'academic',
        'impact',
        'leadership',
        'initiative',
        'communication',
        'name',
        'applicationId',
      ],
    },
  }))

  const { data: runId, error: createError } = await supabase.rpc(
    'create_frozen_selection_ranking_run',
    {
      p_cycle_id: input.cycleId,
      p_name: input.name,
      p_policy_version: policy.version,
      p_winner_target: input.winnerTarget,
      p_reserve_target: input.reserveTarget,
      p_input_checksum: snapshot.checksum,
      p_summary: snapshot.summary,
      p_entries: entries,
      p_actor_id: adminCheck.user.id,
    },
  )

  if (createError || !runId) {
    const status = createError?.code === '23505' ? 409 : 500
    return NextResponse.json(
      {
        message:
          createError?.code === '23505'
            ? 'An identical ranking snapshot already exists for this cycle.'
            : createError?.message || 'Failed to freeze the ranking snapshot',
      },
      { status },
    )
  }

  await supabase.from('selection_audit_events').insert({
    cycle_id: input.cycleId,
    actor_id: adminCheck.user.id,
    event_type: 'selection_ranking_frozen',
    event_data: {
      runId,
      checksum: snapshot.checksum,
      winnerTarget: input.winnerTarget,
      reserveTarget: input.reserveTarget,
      summary: snapshot.summary,
      policyVersion: policy.version,
    },
  })

  return NextResponse.json(
    {
      runId,
      status: 'frozen',
      checksum: snapshot.checksum,
      summary: snapshot.summary,
    },
    { status: 201 },
  )
}
