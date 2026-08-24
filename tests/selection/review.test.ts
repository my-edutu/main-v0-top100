import { describe, expect, it } from 'vitest'

import { buildHumanReviewedAssessment } from '@/lib/selection/review'
import type { SelectionPolicy } from '@/lib/selection/contracts'

const policy: SelectionPolicy = {
  minimumMeritScore: 60,
  academicRequirement: 'first_class_or_equivalent',
  requireVerifiedAcademicEvidence: true,
  version: '2026.1',
}

describe('buildHumanReviewedAssessment', () => {
  it('creates a final qualified assessment with bounded scores and public reasons', () => {
    const result = buildHumanReviewedAssessment({
      applicationId: 'application-1',
      fullName: 'Ada Example',
      country: 'Nigeria',
      verdict: 'qualified',
      scoreBreakdown: {
        academic: 28,
        leadership: 20,
        impact: 18,
        initiative: 8,
        communication: 7,
      },
      publicReasons: ['The academic evidence and merit assessment met the published requirements.'],
      reviewerNotes: 'Reviewed the original result PDF and the supporting leadership evidence.',
      priorInternalReasons: ['OCR confidence required confirmation.'],
      policy,
    })

    expect(result.totalScore).toBe(81)
    expect(result.verdict).toBe('qualified')
    expect(result.requiresHumanReview).toBe(false)
    expect(result.reasonCodes).toContain('HUMAN_REVIEW_QUALIFIED')
    expect(result.internalReasons).toContain('OCR confidence required confirmation.')
  })

  it('rejects a qualified override below the published merit threshold', () => {
    expect(() =>
      buildHumanReviewedAssessment({
        applicationId: 'application-1',
        fullName: 'Ada Example',
        country: 'Nigeria',
        verdict: 'qualified',
        scoreBreakdown: {
          academic: 20,
          leadership: 10,
          impact: 5,
          initiative: 5,
          communication: 5,
        },
        publicReasons: ['Reviewed.'],
        reviewerNotes: 'Manual review completed with evidence.',
        priorInternalReasons: [],
        policy,
      }),
    ).toThrow('minimum merit score')
  })

  it('requires a meaningful public explanation and private reviewer note', () => {
    expect(() =>
      buildHumanReviewedAssessment({
        applicationId: 'application-1',
        fullName: 'Ada Example',
        country: null,
        verdict: 'not_qualified',
        scoreBreakdown: {
          academic: 0,
          leadership: 0,
          impact: 0,
          initiative: 0,
          communication: 0,
        },
        publicReasons: [],
        reviewerNotes: 'short',
        priorInternalReasons: [],
        policy,
      }),
    ).toThrow('public explanation')
  })
})
