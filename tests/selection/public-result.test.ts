import { describe, expect, it } from 'vitest'

import { buildApplicantResultView } from '@/lib/selection/public-result'
import type { SelectionAssessment, SelectionPolicy } from '@/lib/selection/contracts'

const policy: SelectionPolicy = {
  minimumMeritScore: 60,
  academicRequirement: 'first_class_or_equivalent',
  requireVerifiedAcademicEvidence: true,
  version: '2026.1',
}

const assessment: SelectionAssessment = {
  applicationId: 'application-1',
  fullName: 'Ada Example',
  country: 'Nigeria',
  verdict: 'not_qualified',
  totalScore: 55,
  scoreBreakdown: {
    academic: 28,
    leadership: 10,
    impact: 8,
    initiative: 5,
    communication: 4,
  },
  reasonCodes: ['MERIT_SCORE_BELOW_THRESHOLD', 'INTERNAL_DUPLICATE_SIGNAL'],
  internalReasons: ['DUPLICATE_SERIAL_NUMBER matched application-99'],
  publicReasons: [
    'The application met the academic eligibility requirement but did not reach the overall merit score required for this selection cycle.',
  ],
  requiresHumanReview: false,
  policyVersion: '2026.1',
}

describe('buildApplicantResultView', () => {
  it('shows the decision, score breakdown, threshold and understandable reasons', () => {
    const result = buildApplicantResultView({
      assessment,
      policy,
      cycleName: 'Top100 Africa Future Leaders 2026',
      publishedAt: '2026-10-01T09:00:00.000Z',
      appealDeadline: '2026-10-15T23:59:59.000Z',
    })

    expect(result.verdict).toBe('not_qualified')
    expect(result.totalScore).toBe(55)
    expect(result.minimumMeritScore).toBe(60)
    expect(result.scoreBreakdown.leadership.maximum).toBe(25)
    expect(result.reasons).toEqual(assessment.publicReasons)
    expect(result.appeal?.deadline).toBe('2026-10-15T23:59:59.000Z')
  })

  it('never exposes internal integrity reasons or internal reason codes', () => {
    const result = buildApplicantResultView({
      assessment,
      policy,
      cycleName: 'Top100 Africa Future Leaders 2026',
      publishedAt: '2026-10-01T09:00:00.000Z',
    })
    const serialized = JSON.stringify(result)

    expect(serialized).not.toContain('DUPLICATE_SERIAL_NUMBER')
    expect(serialized).not.toContain('INTERNAL_DUPLICATE_SIGNAL')
    expect(serialized).not.toContain('application-99')
  })

  it('does not publish a final rejection while an application still needs review', () => {
    const result = buildApplicantResultView({
      assessment: {
        ...assessment,
        verdict: 'needs_review',
        requiresHumanReview: true,
        publicReasons: ['The application requires additional review before a final decision can be issued.'],
      },
      policy,
      cycleName: 'Top100 Africa Future Leaders 2026',
      publishedAt: '2026-10-01T09:00:00.000Z',
    })

    expect(result.isFinal).toBe(false)
    expect(result.nextStep).toContain('review')
  })
})
