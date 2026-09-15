import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import type { SelectionPolicy } from '@/lib/selection/contracts'
import { buildApplicantResultView } from '@/lib/selection/public-result'
import { buildHumanReviewedAssessment } from '@/lib/selection/review'

export const runtime = 'nodejs'

const reviewSchema = z.object({
  verdict: z.enum(['qualified', 'not_qualified', 'needs_review']),
  scoreBreakdown: z.object({
    academic: z.number().min(0).max(30),
    leadership: z.number().min(0).max(25),
    impact: z.number().min(0).max(25),
    initiative: z.number().min(0).max(10),
    communication: z.number().min(0).max(10),
  }),
  publicReasons: z.array(z.string().trim().min(10).max(600)).min(1).max(8),
  reviewerNotes: z.string().trim().min(10).max(4_000),
})

type RouteContext = {
  params: Promise<{ applicationId: string }>
}

const defaultPolicy: SelectionPolicy = {
  minimumMeritScore: 60,
  academicRequirement: 'first_class_or_equivalent',
  requireVerifiedAcademicEvidence: true,
  version: '2026.1',
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

export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { applicationId } = await params
  let input: z.infer<typeof reviewSchema>
  try {
    input = reviewSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        message: 'The review decision is incomplete or outside the published score limits.',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: application, error: applicationError } = await supabase
    .from('selection_applications')
    .select('id, full_name, country, job_id, cycle_id')
    .eq('id', applicationId)
    .single()

  if (applicationError || !application) {
    return NextResponse.json({ message: 'Selection application not found' }, { status: 404 })
  }

  const [{ data: cycle, error: cycleError }, { data: existingAssessment }] = await Promise.all([
    supabase
      .from('selection_cycles')
      .select('name, policy, appeal_deadline_at')
      .eq('id', application.cycle_id)
      .single(),
    supabase
      .from('selection_assessments')
      .select('internal_reasons')
      .eq('application_id', applicationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (cycleError || !cycle) {
    return NextResponse.json({ message: 'Selection cycle not found' }, { status: 404 })
  }

  const policy = parsePolicy(cycle.policy)
  let assessment
  try {
    assessment = buildHumanReviewedAssessment({
      applicationId,
      fullName: application.full_name,
      country: application.country,
      verdict: input.verdict,
      scoreBreakdown: input.scoreBreakdown,
      publicReasons: input.publicReasons,
      reviewerNotes: input.reviewerNotes,
      priorInternalReasons: existingAssessment?.internal_reasons ?? [],
      policy,
    })
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Review decision is invalid' },
      { status: 400 },
    )
  }

  const reviewedAt = new Date().toISOString()
  const { data: savedAssessment, error: saveError } = await supabase
    .from('selection_assessments')
    .upsert(
      {
        application_id: applicationId,
        job_id: application.job_id,
        policy_version: policy.version,
        verdict: assessment.verdict,
        total_score: assessment.totalScore,
        score_breakdown: assessment.scoreBreakdown,
        reason_codes: assessment.reasonCodes,
        internal_reasons: assessment.internalReasons,
        public_reasons: assessment.publicReasons,
        requires_human_review: assessment.requiresHumanReview,
        reviewer_id: adminCheck.user.id,
        reviewer_notes: input.reviewerNotes,
        reviewed_at: reviewedAt,
      },
      { onConflict: 'application_id,policy_version' },
    )
    .select('id')
    .single()

  if (saveError || !savedAssessment) {
    return NextResponse.json(
      { message: saveError?.message || 'Failed to save the review decision' },
      { status: 500 },
    )
  }

  const resultPayload = buildApplicantResultView({
    assessment,
    policy,
    cycleName: cycle.name,
    publishedAt: reviewedAt,
    appealDeadline: cycle.appeal_deadline_at ?? undefined,
  })

  const [{ error: resultError }, { error: applicationUpdateError }] = await Promise.all([
    supabase.from('selection_public_results').upsert(
      {
        application_id: applicationId,
        assessment_id: savedAssessment.id,
        payload: resultPayload,
        is_published: false,
        published_at: null,
      },
      { onConflict: 'application_id' },
    ),
    supabase
      .from('selection_applications')
      .update({ status: assessment.requiresHumanReview ? 'review_required' : 'assessed' })
      .eq('id', applicationId),
  ])

  if (resultError || applicationUpdateError) {
    return NextResponse.json(
      {
        message:
          resultError?.message ||
          applicationUpdateError?.message ||
          'Failed to prepare the reviewed result',
      },
      { status: 500 },
    )
  }

  await supabase.from('selection_audit_events').insert({
    cycle_id: application.cycle_id,
    job_id: application.job_id,
    application_id: applicationId,
    actor_id: adminCheck.user.id,
    event_type: 'application_human_reviewed',
    event_data: {
      verdict: assessment.verdict,
      totalScore: assessment.totalScore,
      policyVersion: policy.version,
      reviewedAt,
    },
  })
  await supabase.rpc('refresh_selection_job_counts', { p_job_id: application.job_id })

  return NextResponse.json({
    applicationId,
    assessment,
    resultPublished: false,
    message: 'Review saved. Publish the private result link only after a final check.',
  })
}
