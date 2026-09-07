import type { SelectionApplicationInput } from './contracts'
import type { SelectionDocumentExtraction } from './extraction/document-ai'
import type { MeritAssessment } from './merit/openai'

type SelectionApplicationRecord = {
  id: string
  full_name: string
  country: string | null
  institution: string | null
  claimed_academic_status: string | null
  leadership_narrative: string | null
  declaration_confirmed: boolean
  raw_data: Record<string, unknown> | null
}

const normalizeWords = (value: string) => new Set(
  value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter((word) => word.length > 1 && !['of', 'the', 'and'].includes(word)),
)
const institutionSimilarity = (left: string, right: string) => {
  const a = normalizeWords(left)
  const b = normalizeWords(right)
  if (!a.size || !b.size) return 0
  return [...a].filter((word) => b.has(word)).length / new Set([...a, ...b]).size
}

/** OCR and narrative scores are suggestions only. Authentication belongs to human review. */
export function buildSelectionInputFromProcessedEvidence({
  application, extraction, meritAssessment, duplicateSignals,
}: {
  application: SelectionApplicationRecord
  extraction: SelectionDocumentExtraction | null
  meritAssessment: MeritAssessment | null
  duplicateSignals: string[]
}): SelectionApplicationInput {
  const integrityFlags = [...duplicateSignals, 'ACADEMIC_AUTHENTICITY_NOT_VERIFIED', 'DOCUMENT_HOLDER_NOT_VERIFIED']
  const academic = extraction?.academic
  const readable = Boolean(extraction && extraction.text.trim() && extraction.pageCount > 0 &&
    Number.isFinite(extraction.confidence) && extraction.confidence >= 0.55 && extraction.confidence <= 1)
  const text = extraction?.text ?? ''
  const conflictingClasses = /\bfirst\s+class\b/i.test(text) &&
    /\b(?:second\s+class|third\s+class|pass\s+degree)\b/i.test(text)
  const contradictedClaim = /\bfirst\s+class\b/i.test(application.claimed_academic_status ?? '') &&
    academic?.degreeClassification === 'other_classification'
  const impossibleGpa = Boolean(academic && academic.cgpa != null &&
    (!Number.isFinite(academic.cgpa) || academic.cgpa < 0 ||
      (academic.cgpaScale != null && (!Number.isFinite(academic.cgpaScale) ||
        academic.cgpaScale <= 0 || academic.cgpa > academic.cgpaScale))))
  const conflict = conflictingClasses || contradictedClaim || impossibleGpa
  if (conflict) integrityFlags.push('ACADEMIC_FIELDS_REQUIRE_RECONCILIATION')
  if (application.institution && academic?.institutionCandidates.length &&
    !academic.institutionCandidates.some((candidate) => institutionSimilarity(application.institution!, candidate) >= 0.6)) {
    integrityFlags.push('INSTITUTION_NAME_MISMATCH')
  }
  if (!meritAssessment) integrityFlags.push('MERIT_ASSESSMENT_NOT_AVAILABLE')
  else if (meritAssessment.requiresHumanReview || meritAssessment.evidenceQuality === 'insufficient') {
    integrityFlags.push('MERIT_REVIEW_REQUIRED')
  }
  // Never award verified First Class or BGS points from a phrase in OCR text.
  return {
    applicationId: application.id,
    fullName: application.full_name,
    country: application.country,
    academicEligibility: conflict ? 'conflicting' : 'unknown',
    evidenceStatus: !extraction ? 'missing' : !readable ? 'unreadable' : conflict ? 'conflicting' : 'pending',
    hasRequiredAnswers: Boolean(application.full_name?.trim() && application.country?.trim() &&
      application.institution?.trim() && application.leadership_narrative?.trim()),
    consentConfirmed: application.declaration_confirmed,
    academicScore: 0,
    leadershipScore: meritAssessment?.leadershipScore ?? 0,
    impactScore: meritAssessment?.impactScore ?? 0,
    initiativeScore: meritAssessment?.initiativeScore ?? 0,
    communicationScore: meritAssessment?.communicationScore ?? 0,
    integrityFlags: [...new Set(integrityFlags)],
  }
}
