import { describe, expect, it } from 'vitest'

import { buildSelectionInputFromProcessedEvidence } from '@/lib/selection/processor'
import type { MeritAssessment } from '@/lib/selection/merit/openai'
import type { SelectionDocumentExtraction } from '@/lib/selection/extraction/document-ai'

const extraction = (overrides: Partial<SelectionDocumentExtraction> = {}): SelectionDocumentExtraction => ({
  provider: 'google_document_ai',
  text: 'UNIVERSITY OF LAGOS First Class Honours CGPA 4.72 / 5.00',
  pageCount: 2,
  confidence: 0.91,
  academic: {
    degreeClassification: 'first_class',
    cgpa: 4.72,
    cgpaScale: 5,
    bestGraduatingStudent: false,
    institutionCandidates: ['UNIVERSITY OF LAGOS'],
  },
  ...overrides,
})

const merit: MeritAssessment = {
  leadershipScore: 20,
  impactScore: 18,
  initiativeScore: 8,
  communicationScore: 7,
  evidenceQuality: 'strong',
  requiresHumanReview: false,
  internalReasons: ['Specific and measurable leadership evidence.'],
  publicStrengths: ['The application described a clear role and measurable outcome.'],
  publicGaps: [],
}

const application = {
  id: 'application-1',
  full_name: 'Ada Example',
  country: 'Nigeria',
  institution: 'University of Lagos',
  claimed_academic_status: 'First Class',
  leadership_narrative: 'I led a campus programme serving 300 students.',
  declaration_confirmed: true,
  raw_data: {},
}

describe('buildSelectionInputFromProcessedEvidence', () => {
  it('turns verified first-class evidence and structured merit scores into an assessment input', () => {
    const result = buildSelectionInputFromProcessedEvidence({
      application,
      extraction: extraction(),
      meritAssessment: merit,
      duplicateSignals: [],
    })

    expect(result.academicEligibility).toBe('verified_first_class')
    expect(result.evidenceStatus).toBe('verified')
    expect(result.academicScore).toBe(28)
    expect(result.leadershipScore).toBe(20)
    expect(result.integrityFlags).toEqual([])
  })

  it('awards the bounded academic distinction score for verified BGS evidence', () => {
    const result = buildSelectionInputFromProcessedEvidence({
      application,
      extraction: extraction({
        academic: {
          ...extraction().academic,
          bestGraduatingStudent: true,
        },
      }),
      meritAssessment: merit,
      duplicateSignals: [],
    })

    expect(result.academicScore).toBe(30)
  })

  it('routes low-confidence OCR and absent AI scoring to review instead of inventing scores', () => {
    const result = buildSelectionInputFromProcessedEvidence({
      application,
      extraction: extraction({ confidence: 0.3 }),
      meritAssessment: null,
      duplicateSignals: [],
    })

    expect(result.evidenceStatus).toBe('unreadable')
    expect(result.leadershipScore).toBe(0)
    expect(result.integrityFlags).toContain('MERIT_ASSESSMENT_NOT_AVAILABLE')
  })

  it('flags institution and exact-document conflicts internally', () => {
    const result = buildSelectionInputFromProcessedEvidence({
      application: { ...application, institution: 'University of Ghana' },
      extraction: extraction(),
      meritAssessment: merit,
      duplicateSignals: ['EXACT_DOCUMENT_DUPLICATE:application-9'],
    })

    expect(result.integrityFlags).toContain('INSTITUTION_NAME_MISMATCH')
    expect(result.integrityFlags).toContain('EXACT_DOCUMENT_DUPLICATE:application-9')
  })

  it('marks a first-class claim as conflicting when the PDF explicitly shows another class', () => {
    const result = buildSelectionInputFromProcessedEvidence({
      application,
      extraction: extraction({
        academic: {
          ...extraction().academic,
          degreeClassification: 'other_classification',
        },
      }),
      meritAssessment: merit,
      duplicateSignals: [],
    })

    expect(result.academicEligibility).toBe('verified_other_classification')
    expect(result.evidenceStatus).toBe('conflicting')
  })
})
