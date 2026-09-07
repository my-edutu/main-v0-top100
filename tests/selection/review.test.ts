import { describe, expect, it } from 'vitest'
import { buildHumanReviewedAssessment } from '@/lib/selection/review'
const input: Parameters<typeof buildHumanReviewedAssessment>[0] = {
  applicationId: 'application-1', fullName: 'Ada Example', country: 'Nigeria', verdict: 'qualified',
  scoreBreakdown: { academic: 28, leadership: 20, impact: 18, initiative: 8, communication: 7 },
  publicReasons: ['The academic evidence and merit assessment met the published requirements.'],
  reviewerNotes: 'Reviewed original evidence and the synthetic registrar confirmation REF-001.',
  priorInternalReasons: ['OCR confidence required confirmation.'],
  policy: { minimumMeritScore: 60, academicRequirement: 'first_class_or_equivalent', requireVerifiedAcademicEvidence: true, version: '2026.1' },
  verification: { academicOutcome: 'first_class', identityConfirmed: true, academicEvidenceAuthenticated: true,
    leadershipEvidenceReviewed: true, noConflictOfInterest: true,
    evidenceReference: 'Synthetic registrar REF-001; document authenticity and holder confirmed.', equivalenceReference: '' },
}
describe('buildHumanReviewedAssessment', () => {
  it('creates a final qualified assessment only with documented checks and bounded scores', () => {
    const result = buildHumanReviewedAssessment(input)
    expect(result.totalScore).toBe(81)
    expect(result.verdict).toBe('qualified')
    expect(result.requiresHumanReview).toBe(false)
    expect(result.reasonCodes).toContain('HUMAN_REVIEW_QUALIFIED')
    expect(result.internalReasons).toContain('OCR confidence required confirmation.')
  })
  it('rejects a qualified override below the published merit threshold', () => {
    expect(() => buildHumanReviewedAssessment({ ...input,
      scoreBreakdown: { academic: 20, leadership: 10, impact: 5, initiative: 5, communication: 5 },
    })).toThrow('minimum merit score')
  })
  it('requires a meaningful public explanation and private reviewer note', () => {
    expect(() => buildHumanReviewedAssessment({ ...input, verdict: 'not_qualified', publicReasons: [], reviewerNotes: 'short' })).toThrow('public explanation')
  })
})
