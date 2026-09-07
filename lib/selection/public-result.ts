import type {
  ApplicantResultView,
  SelectionAssessment,
  SelectionPolicy,
} from './contracts'

const nextStepForVerdict = (verdict: SelectionAssessment['verdict']) => {
  if (verdict === 'qualified') {
    return 'The selection team will contact you using the verified email address attached to your application.'
  }

  if (verdict === 'needs_review') {
    return 'Your application is still under review. A final result will appear after the additional checks are completed.'
  }

  return 'Review the reasons below. Where an appeal window is available, submit only relevant corrections or supporting evidence.'
}

export function buildApplicantResultView({
  assessment,
  policy,
  cycleName,
  publishedAt,
  appealDeadline,
}: {
  assessment: SelectionAssessment
  policy: SelectionPolicy
  cycleName: string
  publishedAt: string
  appealDeadline?: string
}): ApplicantResultView {
  return {
    cycleName,
    applicantName: assessment.fullName,
    country: assessment.country,
    verdict: assessment.verdict,
    isFinal: assessment.verdict !== 'needs_review',
    totalScore: assessment.totalScore,
    minimumMeritScore: policy.minimumMeritScore,
    scoreBreakdown: {
      academic: { score: assessment.scoreBreakdown.academic, maximum: 30 },
      leadership: { score: assessment.scoreBreakdown.leadership, maximum: 25 },
      impact: { score: assessment.scoreBreakdown.impact, maximum: 25 },
      initiative: { score: assessment.scoreBreakdown.initiative, maximum: 10 },
      communication: { score: assessment.scoreBreakdown.communication, maximum: 10 },
    },
    reasons: assessment.publicReasons.slice(),
    nextStep: nextStepForVerdict(assessment.verdict),
    publishedAt,
    ...(appealDeadline
      ? {
          appeal: {
            deadline: appealDeadline,
            message:
              'An appeal should identify a specific factual or evidence-processing error. It is not a request for a new merit assessment.',
          },
        }
      : {}),
  }
}
