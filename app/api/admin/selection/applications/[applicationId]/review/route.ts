import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import type { SelectionPolicy } from '@/lib/selection/contracts'
import { buildApplicantResultView } from '@/lib/selection/public-result'
import { buildHumanReviewedAssessment } from '@/lib/selection/review'

export const runtime = 'nodejs'
const reviewSchema = z.object({
  expectedRevision: z.number().int().positive().nullable(),
  verdict: z.enum(['qualified', 'not_qualified', 'needs_review']),
  scoreBreakdown: z.object({
    academic: z.number().finite().min(0).max(30),
    leadership: z.number().finite().min(0).max(25),
    impact: z.number().finite().min(0).max(25),
    initiative: z.number().finite().min(0).max(10),
    communication: z.number().finite().min(0).max(10),
  }),
  publicReasons: z.array(z.string().trim().min(10).max(600)).min(1).max(8),
  reviewerNotes: z.string().trim().min(10).max(4000),
  verification: z.object({
    academicOutcome: z.enum(['first_class', 'approved_equivalent', 'requirement_not_met', 'unconfirmed']),
    identityConfirmed: z.boolean(),
    academicEvidenceAuthenticated: z.boolean(),
    leadershipEvidenceReviewed: z.boolean(),
    noConflictOfInterest: z.boolean(),
    evidenceReference: z.string().trim().max(2000),
    equivalenceReference: z.string().trim().max(600),
  }).strict().optional(),
}).strict()

type RouteContext = { params: Promise<{ applicationId: string }> }
export async function POST(request: NextRequest, { params }: RouteContext) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const { applicationId } = await params
  if (!z.string().uuid().safeParse(applicationId).success) {
    return NextResponse.json({ message: 'Invalid application identifier' }, { status: 400 })
  }
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Review fields are incomplete or invalid. Reload if this form is outdated.' }, { status: 400 })
  const input = parsed.data
  const db = createAdminClient()
  const { data: application, error } = await db.from('selection_applications')
    .select('id, full_name, country, cycle_id').eq('id', applicationId).single()
  if (error || !application) return NextResponse.json({ message: 'Application unavailable' }, { status: 404 })
  const { data: cycle, error: cycleError } = await db.from('selection_cycles')
    .select('name, policy, appeal_deadline_at').eq('id', application.cycle_id).single()
  if (cycleError || !cycle) return NextResponse.json({ message: 'Selection policy unavailable; review was not saved.' }, { status: 503 })
  const policy = cycle.policy as SelectionPolicy
  let assessment
  try {
    assessment = buildHumanReviewedAssessment({
      applicationId, fullName: application.full_name, country: application.country,
      ...input, priorInternalReasons: [], policy,
    })
  } catch (cause) {
    return NextResponse.json({ message: cause instanceof Error ? cause.message : 'Review is invalid' }, { status: 400 })
  }
  const payload = buildApplicantResultView({
    assessment, policy, cycleName: cycle.name, publishedAt: new Date().toISOString(),
    appealDeadline: cycle.appeal_deadline_at ?? undefined,
  })
  // One database transaction: compare revision, save review, revoke old result,
  // invalidate ranking approvals, update counts and append the audit record.
  const { error: saveError } = await db.rpc('save_selection_human_review', {
    p_application_id: applicationId, p_actor_id: admin.user.id,
    p_expected_revision: input.expectedRevision, p_policy_version: policy.version,
    p_assessment: assessment, p_verification: input.verification ?? {},
    p_reviewer_notes: input.reviewerNotes, p_payload: payload,
  })
  if (saveError) return NextResponse.json({
    message: ['40001', '23514', '42501'].includes(saveError.code)
      ? 'This case, policy or reviewer access changed, or verification is incomplete. Reload and review again; nothing was saved.'
      : 'The review could not be saved safely. No partial decision was committed.',
  }, { status: ['40001', '23514', '42501'].includes(saveError.code) ? 409 : 503 })
  return NextResponse.json({ applicationId, assessment, revision: (input.expectedRevision ?? 0) + 1, resultPublished: false,
    message: 'Review saved privately. A different administrator must authorize publication.' })
}
