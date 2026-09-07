import { describe, expect, it } from 'vitest'
import { buildSelectionInputFromProcessedEvidence as processEvidence } from '@/lib/selection/processor'
import { buildHumanReviewedAssessment as review } from '@/lib/selection/review'
import type { SelectionReviewVerification } from '@/lib/selection/assurance'

const input: Parameters<typeof processEvidence>[0] = {
  application: { id: 'invented-a', full_name: 'Ada Example', country: 'Nigeria', institution: 'Example University',
    claimed_academic_status: 'First Class', leadership_narrative: 'Invented programme supporting 300 learners.',
    declaration_confirmed: true, raw_data: {} },
  extraction: { provider: 'google_document_ai', text: 'Certificate: Someone Else. First Class', pageCount: 1,
    confidence: 0.99, academic: { degreeClassification: 'first_class', cgpa: 4.8, cgpaScale: 5,
      bestGraduatingStudent: false, institutionCandidates: ['EXAMPLE UNIVERSITY'] } },
  meritAssessment: { leadershipScore: 25, impactScore: 25, initiativeScore: 10, communicationScore: 10,
    evidenceQuality: 'strong', requiresHumanReview: false, internalReasons: [], publicStrengths: [], publicGaps: [] },
  duplicateSignals: [],
}
const verification: SelectionReviewVerification = {
  academicOutcome: 'first_class', identityConfirmed: true, academicEvidenceAuthenticated: true,
  leadershipEvidenceReviewed: true, noConflictOfInterest: true,
  evidenceReference: 'Synthetic registrar confirmation REF-001; document and holder checked.', equivalenceReference: '',
}
const decision: Parameters<typeof review>[0] = {
  applicationId: 'invented-a', fullName: 'Ada Example', country: 'Nigeria', verdict: 'qualified',
  scoreBreakdown: { academic: 28, leadership: 20, impact: 20, initiative: 8, communication: 8 },
  publicReasons: ['The reviewed evidence meets the programme requirements.'],
  reviewerNotes: 'Invented evidence checked against the synthetic registrar source.', priorInternalReasons: [],
  policy: { minimumMeritScore: 60, academicRequirement: 'first_class_or_equivalent',
    requireVerifiedAcademicEvidence: true, version: '2026.1' }, verification,
}

describe('Selection assurance adversarial regression cases', () => {
  it('never authenticates an applicant from OCR', () => {
    const result = processEvidence(input)
    expect(result.evidenceStatus).toBe('pending')
    expect(result.academicEligibility).toBe('unknown')
    expect(result.integrityFlags).toContain('DOCUMENT_HOLDER_NOT_VERIFIED')
  })
  it('does not award BGS points from a phrase', () => {
    const extraction = input.extraction!
    expect(processEvidence({ ...input, extraction: { ...extraction,
      academic: { ...extraction.academic, bestGraduatingStudent: true } } }).academicScore).toBe(0)
  })
  for (const confidence of [NaN, Infinity, -1, 1.2, 0.3]) {
    it(`routes invalid or low OCR confidence ${confidence} to review`, () => {
      expect(processEvidence({ ...input, extraction: { ...input.extraction!, confidence } }).evidenceStatus).toBe('unreadable')
    })
  }
  it('does not accept empty extracted text', () => {
    expect(processEvidence({ ...input, extraction: { ...input.extraction!, text: ' ' } }).evidenceStatus).toBe('unreadable')
  })
  it('does not pick a classification out of a grading legend', () => {
    expect(processEvidence({ ...input, extraction: { ...input.extraction!, text: 'First Class; Second Class; Third Class' } }).evidenceStatus).toBe('conflicting')
  })
  it('routes an impossible CGPA to reconciliation', () => {
    expect(processEvidence({ ...input, extraction: { ...input.extraction!, academic: { ...input.extraction!.academic, cgpa: 6, cgpaScale: 5 } } }).evidenceStatus).toBe('conflicting')
  })
  for (const key of ['identityConfirmed', 'academicEvidenceAuthenticated', 'leadershipEvidenceReviewed', 'noConflictOfInterest'] as const) {
    it(`blocks final qualification without ${key}`, () => {
      expect(() => review({ ...decision, verification: { ...verification, [key]: false } })).toThrow()
    })
  }
  it('blocks absent verification', () => expect(() => review({ ...decision, verification: undefined })).toThrow())
  it('blocks an unconfirmed academic classification', () => expect(() => review({ ...decision,
    verification: { ...verification, academicOutcome: 'unconfirmed' } })).toThrow())
  it('blocks high-scoring but academically ineligible qualification', () => expect(() => review({ ...decision,
    verification: { ...verification, academicOutcome: 'requirement_not_met' } })).toThrow())
  it('requires an approved local equivalence rule', () => expect(() => review({ ...decision,
    verification: { ...verification, academicOutcome: 'approved_equivalent' } })).toThrow())
  it('accepts documented local equivalence', () => expect(review({ ...decision,
    verification: { ...verification, academicOutcome: 'approved_equivalent', equivalenceReference: 'Synthetic policy REF-EQ v1' } }).verdict).toBe('qualified'))
  it('rejects a NaN threshold', () => expect(() => review({ ...decision,
    policy: { ...decision.policy, minimumMeritScore: NaN } })).toThrow())
  it('rejects bypassing evidence verification', () => expect(() => review({ ...decision,
    policy: { ...decision.policy, requireVerifiedAcademicEvidence: false } })).toThrow())
  it('rejects a missing policy version', () => expect(() => review({ ...decision,
    policy: { ...decision.policy, version: ' ' } })).toThrow())
  it('rejects an over-limit score', () => expect(() => review({ ...decision,
    scoreBreakdown: { ...decision.scoreBreakdown, impact: 26 } })).toThrow())
  it('still permits an accountable documented human review', () => expect(review(decision).verdict).toBe('qualified'))
  it('permits keeping uncertainty unresolved without attestations', () => expect(review({ ...decision,
    verdict: 'needs_review', verification: undefined }).verdict).toBe('needs_review'))
  it('does not turn missing evidence into fabricated evidence', () => expect(processEvidence({ ...input, extraction: null }).evidenceStatus).toBe('missing'))
})
