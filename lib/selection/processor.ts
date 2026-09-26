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

const normalizeWords = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 1 && !['of', 'the', 'and'].includes(word)),
  )

const institutionSimilarity = (left: string, right: string) => {
  const leftWords = normalizeWords(left)
  const rightWords = normalizeWords(right)
  if (leftWords.size === 0 || rightWords.size === 0) return 0

  const intersection = Array.from(leftWords).filter((word) => rightWords.has(word)).length
  const union = new Set([...leftWords, ...rightWords]).size
  return union === 0 ? 0 : intersection / union
}

const hasInstitutionMatch = (claimed: string, candidates: string[]) =>
  candidates.some((candidate) => institutionSimilarity(claimed, candidate) >= 0.6)

const claimsFirstClass = (value: string | null) => /\bfirst\s+class\b/i.test(value ?? '')

export function buildSelectionInputFromProcessedEvidence({
  application,
  extraction,
  meritAssessment,
  duplicateSignals,
}: {
  application: SelectionApplicationRecord
  extraction: SelectionDocumentExtraction | null
  meritAssessment: MeritAssessment | null
  duplicateSignals: string[]
}): SelectionApplicationInput {
  const integrityFlags = duplicateSignals.slice()
  const academic = extraction?.academic

  if (
    application.institution &&
    academic &&
    academic.institutionCandidates.length > 0 &&
    !hasInstitutionMatch(application.institution, academic.institutionCandidates)
  ) {
    integrityFlags.push('INSTITUTION_NAME_MISMATCH')
  }

  if (!meritAssessment) {
    integrityFlags.push('MERIT_ASSESSMENT_NOT_AVAILABLE')
  } else if (meritAssessment.requiresHumanReview || meritAssessment.evidenceQuality === 'insufficient') {
    integrityFlags.push('MERIT_REVIEW_REQUIRED')
  }

  const academicEligibility: SelectionApplicationInput['academicEligibility'] = !academic
    ? 'unknown'
    : academic.degreeClassification === 'first_class'
      ? 'verified_first_class'
      : academic.degreeClassification === 'other_classification'
        ? 'verified_other_classification'
        : 'unknown'

  let evidenceStatus: SelectionApplicationInput['evidenceStatus'] = !extraction
    ? 'missing'
    : extraction.confidence < 0.55
      ? 'unreadable'
      : 'verified'

  if (
    evidenceStatus === 'verified' &&
    claimsFirstClass(application.claimed_academic_status) &&
    academicEligibility === 'verified_other_classification'
  ) {
    evidenceStatus = 'conflicting'
  }

  const hasRequiredAnswers = Boolean(
    application.full_name?.trim() &&
      application.country?.trim() &&
      application.institution?.trim() &&
      application.leadership_narrative?.trim(),
  )

  return {
    applicationId: application.id,
    fullName: application.full_name,
    country: application.country,
    academicEligibility,
    evidenceStatus,
    hasRequiredAnswers,
    consentConfirmed: application.declaration_confirmed,
    academicScore:
      academicEligibility === 'verified_first_class'
        ? academic?.bestGraduatingStudent
          ? 30
          : 28
        : 0,
    leadershipScore: meritAssessment?.leadershipScore ?? 0,
    impactScore: meritAssessment?.impactScore ?? 0,
    initiativeScore: meritAssessment?.initiativeScore ?? 0,
    communicationScore: meritAssessment?.communicationScore ?? 0,
    integrityFlags: Array.from(new Set(integrityFlags)),
  }
}
