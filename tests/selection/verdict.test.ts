import { describe, expect, it } from 'vitest'

import { evaluateSelectionApplication } from '@/lib/selection/verdict'
import type { SelectionApplicationInput, SelectionPolicy } from '@/lib/selection/contracts'

const policy: SelectionPolicy = {
  minimumMeritScore: 60,
  academicRequirement: 'first_class_or_equivalent',
  requireVerifiedAcademicEvidence: true,
  version: '2026.1',
}

const eligibleApplication = (overrides: Partial<SelectionApplicationInput> = {}): SelectionApplicationInput => ({
  applicationId: 'application-1',
  fullName: 'Ada Example',
  country: 'Nigeria',
  academicEligibility: 'verified_first_class',
  evidenceStatus: 'verified',
  hasRequiredAnswers: true,
  consentConfirmed: true,
  academicScore: 28,
  leadershipScore: 18,
  impactScore: 16,
  initiativeScore: 7,
  communicationScore: 7,
  integrityFlags: [],
  ...overrides,
})

describe('evaluateSelectionApplication', () => {
  it('qualifies a verified eligible applicant who meets the merit threshold', () => {
    const assessment = evaluateSelectionApplication(eligibleApplication(), policy)

    expect(assessment.verdict).toBe('qualified')
    expect(assessment.totalScore).toBe(76)
    expect(assessment.requiresHumanReview).toBe(false)
    expect(assessment.reasonCodes).toContain('MERIT_THRESHOLD_MET')
  })

  it('does not qualify an applicant whose evidence confirms a non-eligible classification', () => {
    const assessment = evaluateSelectionApplication(
      eligibleApplication({ academicEligibility: 'verified_other_classification' }),
      policy,
    )

    expect(assessment.verdict).toBe('not_qualified')
    expect(assessment.reasonCodes).toContain('ACADEMIC_REQUIREMENT_NOT_MET')
    expect(assessment.publicReasons).toContain(
      'The academic evidence reviewed did not confirm the required First Class degree or an approved equivalent.',
    )
  })

  it('routes unreadable or incomplete academic proof to review rather than treating it as fraud', () => {
    const assessment = evaluateSelectionApplication(
      eligibleApplication({
        academicEligibility: 'unknown',
        evidenceStatus: 'unreadable',
      }),
      policy,
    )

    expect(assessment.verdict).toBe('needs_review')
    expect(assessment.requiresHumanReview).toBe(true)
    expect(assessment.reasonCodes).toContain('ACADEMIC_EVIDENCE_UNREADABLE')
    expect(assessment.publicReasons).toContain(
      'The submitted academic evidence could not be read clearly enough to confirm eligibility.',
    )
  })

  it('keeps internal integrity flags out of the applicant-facing explanation', () => {
    const assessment = evaluateSelectionApplication(
      eligibleApplication({ integrityFlags: ['POSSIBLE_TEMPLATE_MISMATCH', 'DUPLICATE_SERIAL_NUMBER'] }),
      policy,
    )

    expect(assessment.verdict).toBe('needs_review')
    expect(assessment.internalReasons.join(' ')).toContain('DUPLICATE_SERIAL_NUMBER')
    expect(assessment.publicReasons.join(' ')).not.toContain('fraud')
    expect(assessment.publicReasons.join(' ')).not.toContain('duplicate serial')
  })

  it('explains when an eligible application falls below the merit threshold', () => {
    const assessment = evaluateSelectionApplication(
      eligibleApplication({ leadershipScore: 5, impactScore: 4, initiativeScore: 2, communicationScore: 2 }),
      policy,
    )

    expect(assessment.totalScore).toBe(41)
    expect(assessment.verdict).toBe('not_qualified')
    expect(assessment.reasonCodes).toContain('MERIT_SCORE_BELOW_THRESHOLD')
    expect(assessment.publicReasons).toContain(
      'The application met the academic eligibility requirement but did not reach the overall merit score required for this selection cycle.',
    )
  })

  it('fails closed when required answers or consent are missing', () => {
    const missingAnswers = evaluateSelectionApplication(
      eligibleApplication({ hasRequiredAnswers: false }),
      policy,
    )
    const missingConsent = evaluateSelectionApplication(
      eligibleApplication({ consentConfirmed: false }),
      policy,
    )

    expect(missingAnswers.verdict).toBe('not_qualified')
    expect(missingAnswers.reasonCodes).toContain('REQUIRED_INFORMATION_MISSING')
    expect(missingConsent.verdict).toBe('not_qualified')
    expect(missingConsent.reasonCodes).toContain('DECLARATION_NOT_CONFIRMED')
  })

  it('clamps component scores to their published maximums', () => {
    const assessment = evaluateSelectionApplication(
      eligibleApplication({
        academicScore: 100,
        leadershipScore: 100,
        impactScore: 100,
        initiativeScore: 100,
        communicationScore: 100,
      }),
      policy,
    )

    expect(assessment.scoreBreakdown).toEqual({
      academic: 30,
      leadership: 25,
      impact: 25,
      initiative: 10,
      communication: 10,
    })
    expect(assessment.totalScore).toBe(100)
  })
})
