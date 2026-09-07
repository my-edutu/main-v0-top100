import { assertReviewVerification, assertSelectionPolicy, type SelectionReviewVerification } from './assurance'
import type {
  SelectionAssessment,
  SelectionPolicy,
  SelectionScoreBreakdown,
  SelectionVerdict,
} from './contracts'

const limits: Record<keyof SelectionScoreBreakdown, number> = {
  academic: 30,
  leadership: 25,
  impact: 25,
  initiative: 10,
  communication: 10,
}

const normalizeScore = (value: number, key: keyof SelectionScoreBreakdown) => {
  if (!Number.isFinite(value) || value < 0 || value > limits[key]) {
    throw new Error(`${key} score must be between 0 and ${limits[key]}`)
  }
  return Math.round(value * 100) / 100
}

export function buildHumanReviewedAssessment({
  applicationId,
  fullName,
  country,
  verdict,
  scoreBreakdown,
  publicReasons,
  reviewerNotes,
  priorInternalReasons,
  policy,
  verification,
}: {
  applicationId: string
  fullName: string
  country: string | null
  verdict: SelectionVerdict
  scoreBreakdown: SelectionScoreBreakdown
  publicReasons: string[]
  reviewerNotes: string
  priorInternalReasons: string[]
  policy: SelectionPolicy
  verification?: SelectionReviewVerification
}): SelectionAssessment {
  assertSelectionPolicy(policy)
  assertReviewVerification(verdict, verification)
  const reasons = publicReasons.map((reason) => reason.trim()).filter(Boolean)
  if (reasons.length === 0 || reasons.some((reason) => reason.length < 10)) {
    throw new Error('A meaningful applicant-facing public explanation is required')
  }
  if (reviewerNotes.trim().length < 10) {
    throw new Error('A private reviewer note of at least 10 characters is required')
  }

  const normalized: SelectionScoreBreakdown = {
    academic: normalizeScore(scoreBreakdown.academic, 'academic'),
    leadership: normalizeScore(scoreBreakdown.leadership, 'leadership'),
    impact: normalizeScore(scoreBreakdown.impact, 'impact'),
    initiative: normalizeScore(scoreBreakdown.initiative, 'initiative'),
    communication: normalizeScore(scoreBreakdown.communication, 'communication'),
  }
  const totalScore = Math.round(
    (normalized.academic +
      normalized.leadership +
      normalized.impact +
      normalized.initiative +
      normalized.communication) *
      100,
  ) / 100

  if (verdict === 'qualified' && totalScore < policy.minimumMeritScore) {
    throw new Error(
      `A qualified result must meet the published minimum merit score of ${policy.minimumMeritScore}`,
    )
  }

  return {
    applicationId,
    fullName,
    country,
    verdict,
    totalScore,
    scoreBreakdown: normalized,
    reasonCodes: [
      verdict === 'qualified'
        ? 'HUMAN_REVIEW_QUALIFIED'
        : verdict === 'not_qualified'
          ? 'HUMAN_REVIEW_NOT_QUALIFIED'
          : 'HUMAN_REVIEW_REQUIRES_MORE_EVIDENCE',
    ],
    internalReasons: Array.from(
      new Set([...priorInternalReasons, `Reviewer note: ${reviewerNotes.trim()}`]),
    ),
    publicReasons: Array.from(new Set(reasons)),
    requiresHumanReview: verdict === 'needs_review',
    policyVersion: policy.version,
  }
}
