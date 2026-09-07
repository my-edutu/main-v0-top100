import { describe, expect, it } from 'vitest'

import {
  averageDocumentAiConfidence,
  buildDocumentAiProcessorUrl,
  extractAcademicFieldsFromText,
} from '@/lib/selection/extraction/document-ai'

describe('extractAcademicFieldsFromText', () => {
  it('extracts first-class, CGPA, scale and best-graduating-student evidence', () => {
    const result = extractAcademicFieldsFromText(`
      UNIVERSITY OF LAGOS
      This is to certify that ADA EXAMPLE was awarded the degree of Bachelor of Science.
      Degree Classification: First Class Honours
      Cumulative Grade Point Average (CGPA): 4.72 / 5.00
      Best Graduating Student in the Department of Computer Science
    `)

    expect(result.degreeClassification).toBe('first_class')
    expect(result.cgpa).toBe(4.72)
    expect(result.cgpaScale).toBe(5)
    expect(result.bestGraduatingStudent).toBe(true)
    expect(result.institutionCandidates).toContain('UNIVERSITY OF LAGOS')
  })

  it('does not invent academic eligibility when the document is ambiguous', () => {
    const result = extractAcademicFieldsFromText('Statement of Result. Bachelor of Arts. Issued 2025.')

    expect(result.degreeClassification).toBe('unknown')
    expect(result.cgpa).toBeNull()
    expect(result.cgpaScale).toBeNull()
    expect(result.bestGraduatingStudent).toBe(false)
  })

  it('recognizes a non-first-class classification as explicit evidence', () => {
    const result = extractAcademicFieldsFromText('CLASS OF DEGREE: SECOND CLASS HONOURS (UPPER DIVISION)')

    expect(result.degreeClassification).toBe('other_classification')
  })
})

describe('averageDocumentAiConfidence', () => {
  it('averages available token confidence values and ignores missing values', () => {
    expect(
      averageDocumentAiConfidence({
        pages: [
          { tokens: [{ layout: { confidence: 0.8 } }, { layout: { confidence: 0.6 } }] },
          { tokens: [{ layout: {} }, { layout: { confidence: 1 } }] },
        ],
      }),
    ).toBe(0.8)
  })

  it('returns zero when Document AI provides no confidence values', () => {
    expect(averageDocumentAiConfidence({ pages: [] })).toBe(0)
  })
})

describe('buildDocumentAiProcessorUrl', () => {
  it('uses the regional v1 process endpoint', () => {
    expect(
      buildDocumentAiProcessorUrl({
        projectId: 'top100-project',
        location: 'eu',
        processorId: 'processor-123',
      }),
    ).toBe(
      'https://eu-documentai.googleapis.com/v1/projects/top100-project/locations/eu/processors/processor-123:process',
    )
  })
})
