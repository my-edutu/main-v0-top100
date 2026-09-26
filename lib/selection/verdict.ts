import type {
  SelectionApplicationInput,
  SelectionAssessment,
  SelectionPolicy,
  SelectionReasonCode,
  SelectionScoreBreakdown,
  SelectionVerdict,
} from './contracts'

const SCORE_LIMITS = {
  academic: 30,
  leadership: 25,
  impact: 25,
  initiative: 10,
  communication: 10,
} as const

const clampScore = (value: number, maximum: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.min(maximum, Math.max(0, Math.round(value * 100) / 100))
}

const buildScoreBreakdown = (application: SelectionApplicationInput): SelectionScoreBreakdown => ({
  academic: clampScore(application.academicScore, SCORE_LIMITS.academic),
  leadership: clampScore(application.leadershipScore, SCORE_LIMITS.leadership),
  impact: clampScore(application.impactScore, SCORE_LIMITS.impact),
  initiative: clampScore(application.initiativeScore, SCORE_LIMITS.initiative),
  communication: clampScore(application.communicationScore, SCORE_LIMITS.communication),
})

const sumScores = (scoreBreakdown: SelectionScoreBreakdown) =>
  Math.round(
    (scoreBreakdown.academic +
      scoreBreakdown.leadership +
      scoreBreakdown.impact +
      scoreBreakdown.initiative +
      scoreBreakdown.communication) *
      100,
  ) / 100

const PUBLIC_MESSAGES = {
  qualified: 'The application met the published eligibility and merit requirements.',
  academicRequirementNotMet:
    'The academic evidence reviewed did not confirm the required First Class degree or an approved equivalent.',
  scoreBelowThreshold:
    'The application met the academic eligibility requirement but did not reach the overall merit score required for this selection cycle.',
  evidenceMissing:
    'The required academic evidence was not available, so eligibility could not be confirmed.',
  evidenceUnreadable:
    'The submitted academic evidence could not be read clearly enough to confirm eligibility.',
  evidenceConflict:
    'Some information in the application and academic evidence did not match and requires further review.',
  eligibilityUnconfirmed:
    'The academic classification could not be confirmed automatically and requires further review.',
  requiredInformationMissing:
    'One or more required application details were missing at the time of assessment.',
  declarationMissing:
    'The required declaration confirming the accuracy of the application was not completed.',
  integrityReview:
    'The application requires additional review before a final decision can be issued.',
} as const

const createAssessment = ({
  application,
  policy,
  scoreBreakdown,
  verdict,
  reasonCodes,
  publicReasons,
  internalReasons = [],
  requiresHumanReview = false,
}: {
  application: SelectionApplicationInput
  policy: SelectionPolicy
  scoreBreakdown: SelectionScoreBreakdown
  verdict: SelectionVerdict
  reasonCodes: SelectionReasonCode[]
  publicReasons: string[]
  internalReasons?: string[]
  requiresHumanReview?: boolean
}): SelectionAssessment => ({
  applicationId: application.applicationId,
  fullName: application.fullName.trim() || 'Unnamed applicant',
  country: application.country?.trim() || null,
  verdict,
  totalScore: sumScores(scoreBreakdown),
  scoreBreakdown,
  reasonCodes,
  internalReasons,
  publicReasons: Array.from(new Set(publicReasons)),
  requiresHumanReview,
  policyVersion: policy.version,
})

export function evaluateSelectionApplication(
  application: SelectionApplicationInput,
  policy: SelectionPolicy,
): SelectionAssessment {
  const scoreBreakdown = buildScoreBreakdown(application)

  if (!application.hasRequiredAnswers) {
    return createAssessment({
      application,
      policy,
      scoreBreakdown,
      verdict: 'not_qualified',
      reasonCodes: ['REQUIRED_INFORMATION_MISSING'],
      publicReasons: [PUBLIC_MESSAGES.requiredInformationMissing],
    })
  }

  if (!application.consentConfirmed) {
    return createAssessment({
      application,
      policy,
      scoreBreakdown,
      verdict: 'not_qualified',
      reasonCodes: ['DECLARATION_NOT_CONFIRMED'],
      publicReasons: [PUBLIC_MESSAGES.declarationMissing],
    })
  }

  if (policy.requireVerifiedAcademicEvidence) {
    if (application.evidenceStatus === 'missing') {
      return createAssessment({
        application,
        policy,
        scoreBreakdown,
        verdict: 'needs_review',
        reasonCodes: ['ACADEMIC_EVIDENCE_MISSING'],
        publicReasons: [PUBLIC_MESSAGES.evidenceMissing],
        requiresHumanReview: true,
      })
    }

    if (application.evidenceStatus === 'unreadable') {
      return createAssessment({
        application,
        policy,
        scoreBreakdown,
        verdict: 'needs_review',
        reasonCodes: ['ACADEMIC_EVIDENCE_UNREADABLE'],
        publicReasons: [PUBLIC_MESSAGES.evidenceUnreadable],
        requiresHumanReview: true,
      })
    }

    if (application.evidenceStatus === 'conflicting') {
      return createAssessment({
        application,
        policy,
        scoreBreakdown,
        verdict: 'needs_review',
        reasonCodes: ['ACADEMIC_EVIDENCE_CONFLICT'],
        publicReasons: [PUBLIC_MESSAGES.evidenceConflict],
        requiresHumanReview: true,
      })
    }

    if (application.evidenceStatus === 'pending') {
      return createAssessment({
        application,
        policy,
        scoreBreakdown,
        verdict: 'needs_review',
        reasonCodes: ['ACADEMIC_ELIGIBILITY_UNCONFIRMED'],
        publicReasons: [PUBLIC_MESSAGES.eligibilityUnconfirmed],
        requiresHumanReview: true,
      })
    }
  }

  if (application.academicEligibility === 'conflicting') {
    return createAssessment({
      application,
      policy,
      scoreBreakdown,
      verdict: 'needs_review',
      reasonCodes: ['ACADEMIC_EVIDENCE_CONFLICT'],
      publicReasons: [PUBLIC_MESSAGES.evidenceConflict],
      requiresHumanReview: true,
    })
  }

  if (application.academicEligibility === 'unknown') {
    return createAssessment({
      application,
      policy,
      scoreBreakdown,
      verdict: 'needs_review',
      reasonCodes: ['ACADEMIC_ELIGIBILITY_UNCONFIRMED'],
      publicReasons: [PUBLIC_MESSAGES.eligibilityUnconfirmed],
      requiresHumanReview: true,
    })
  }

  if (application.integrityFlags.length > 0) {
    return createAssessment({
      application,
      policy,
      scoreBreakdown,
      verdict: 'needs_review',
      reasonCodes: ['INTEGRITY_REVIEW_REQUIRED'],
      internalReasons: application.integrityFlags,
      publicReasons: [PUBLIC_MESSAGES.integrityReview],
      requiresHumanReview: true,
    })
  }

  if (application.academicEligibility === 'verified_other_classification') {
    return createAssessment({
      application,
      policy,
      scoreBreakdown,
      verdict: 'not_qualified',
      reasonCodes: ['ACADEMIC_REQUIREMENT_NOT_MET'],
      publicReasons: [PUBLIC_MESSAGES.academicRequirementNotMet],
    })
  }

  const totalScore = sumScores(scoreBreakdown)
  const equivalentReason: SelectionReasonCode[] =
    application.academicEligibility === 'verified_local_equivalent'
      ? ['ACADEMIC_EQUIVALENT_VERIFIED']
      : []

  if (totalScore < policy.minimumMeritScore) {
    return createAssessment({
      application,
      policy,
      scoreBreakdown,
      verdict: 'not_qualified',
      reasonCodes: [...equivalentReason, 'MERIT_SCORE_BELOW_THRESHOLD'],
      publicReasons: [PUBLIC_MESSAGES.scoreBelowThreshold],
    })
  }

  return createAssessment({
    application,
    policy,
    scoreBreakdown,
    verdict: 'qualified',
    reasonCodes: [...equivalentReason, 'MERIT_THRESHOLD_MET'],
    publicReasons: [PUBLIC_MESSAGES.qualified],
  })
}
