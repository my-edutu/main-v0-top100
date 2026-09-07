import { describe, expect, it } from 'vitest'
import { buildSelectionInputFromProcessedEvidence } from '@/lib/selection/processor'
import type { SelectionDocumentExtraction } from '@/lib/selection/extraction/document-ai'
import type { MeritAssessment } from '@/lib/selection/merit/openai'
const extraction = (overrides: Partial<SelectionDocumentExtraction> = {}): SelectionDocumentExtraction => ({
  provider: 'google_document_ai', text: 'UNIVERSITY OF LAGOS First Class Honours CGPA 4.72 / 5.00',
  pageCount: 2, confidence: 0.91, academic: { degreeClassification: 'first_class', cgpa: 4.72,
    cgpaScale: 5, bestGraduatingStudent: false, institutionCandidates: ['UNIVERSITY OF LAGOS'] }, ...overrides,
})
const merit: MeritAssessment = { leadershipScore: 20, impactScore: 18, initiativeScore: 8, communicationScore: 7,
  evidenceQuality: 'strong', requiresHumanReview: false, internalReasons: ['Specific leadership claims.'],
  publicStrengths: ['Clear role and measurable outcome described.'], publicGaps: [] }
const application = { id: 'application-1', full_name: 'Ada Example', country: 'Nigeria', institution: 'University of Lagos',
  claimed_academic_status: 'First Class', leadership_narrative: 'I led a campus programme serving 300 students.', declaration_confirmed: true, raw_data: {} }
const process = (changes: Partial<Parameters<typeof buildSelectionInputFromProcessedEvidence>[0]> = {}) =>
  buildSelectionInputFromProcessedEvidence({ application, extraction: extraction(), meritAssessment: merit, duplicateSignals: [], ...changes })
describe('buildSelectionInputFromProcessedEvidence', () => {
  it('keeps extracted academic claims provisional while preserving bounded merit suggestions', () => {
    const result = process()
    expect(result.academicEligibility).toBe('unknown')
    expect(result.evidenceStatus).toBe('pending')
    expect(result.academicScore).toBe(0)
    expect(result.leadershipScore).toBe(20)
    expect(result.integrityFlags).toContain('ACADEMIC_AUTHENTICITY_NOT_VERIFIED')
  })
  it('requires human verification for a BGS claim instead of automatically awarding a bonus', () => {
    expect(process({ extraction: extraction({ academic: { ...extraction().academic, bestGraduatingStudent: true } }) }).academicScore).toBe(0)
  })
  it('routes low-confidence OCR and unavailable merit assessment to review', () => {
    const result = process({ extraction: extraction({ confidence: 0.3 }), meritAssessment: null })
    expect(result.evidenceStatus).toBe('unreadable')
    expect(result.leadershipScore).toBe(0)
    expect(result.integrityFlags).toContain('MERIT_ASSESSMENT_NOT_AVAILABLE')
  })
  it('preserves institution and duplicate-document signals', () => {
    const result = process({ application: { ...application, institution: 'University of Ghana' }, duplicateSignals: ['EXACT_DOCUMENT_DUPLICATE:application-9'] })
    expect(result.integrityFlags).toContain('INSTITUTION_NAME_MISMATCH')
    expect(result.integrityFlags).toContain('EXACT_DOCUMENT_DUPLICATE:application-9')
  })
  it('routes conflicting classifications to reconciliation, not verified rejection', () => {
    const result = process({ extraction: extraction({ academic: { ...extraction().academic, degreeClassification: 'other_classification' } }) })
    expect(result.academicEligibility).toBe('conflicting')
    expect(result.evidenceStatus).toBe('conflicting')
  })
})
