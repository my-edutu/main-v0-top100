export const SELECTION_BATCH_SIZE = 100
export const SELECTION_PDF_MAX_BYTES = 25 * 1024 * 1024

export type SelectionSourceType = 'google_form' | 'google_sheet' | 'pdf_upload'

export type SelectionJobStatus =
  | 'draft'
  | 'ready'
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'

export type SelectionApplicationStatus =
  | 'imported'
  | 'queued'
  | 'processing'
  | 'review_required'
  | 'assessed'
  | 'published'

export type SelectionVerdict = 'qualified' | 'not_qualified' | 'needs_review'

export type AcademicEligibility =
  | 'verified_first_class'
  | 'verified_local_equivalent'
  | 'verified_other_classification'
  | 'unknown'
  | 'conflicting'

export type EvidenceStatus =
  | 'verified'
  | 'pending'
  | 'missing'
  | 'unreadable'
  | 'conflicting'

export type SelectionReasonCode =
  | 'MERIT_THRESHOLD_MET'
  | 'MERIT_SCORE_BELOW_THRESHOLD'
  | 'ACADEMIC_REQUIREMENT_NOT_MET'
  | 'ACADEMIC_EQUIVALENT_VERIFIED'
  | 'ACADEMIC_EVIDENCE_MISSING'
  | 'ACADEMIC_EVIDENCE_UNREADABLE'
  | 'ACADEMIC_EVIDENCE_CONFLICT'
  | 'ACADEMIC_ELIGIBILITY_UNCONFIRMED'
  | 'REQUIRED_INFORMATION_MISSING'
  | 'DECLARATION_NOT_CONFIRMED'
  | 'INTEGRITY_REVIEW_REQUIRED'
  | 'MERIT_REVIEW_REQUIRED'
  | (string & {})

export type SelectionPolicy = {
  minimumMeritScore: number
  academicRequirement: 'first_class_or_equivalent'
  requireVerifiedAcademicEvidence: boolean
  version: string
}

export type SelectionScoreBreakdown = {
  academic: number
  leadership: number
  impact: number
  initiative: number
  communication: number
}

export type SelectionApplicationInput = {
  applicationId: string
  fullName: string
  country: string | null
  academicEligibility: AcademicEligibility
  evidenceStatus: EvidenceStatus
  hasRequiredAnswers: boolean
  consentConfirmed: boolean
  academicScore: number
  leadershipScore: number
  impactScore: number
  initiativeScore: number
  communicationScore: number
  integrityFlags: string[]
}

export type SelectionAssessment = {
  applicationId: string
  fullName: string
  country: string | null
  verdict: SelectionVerdict
  totalScore: number
  scoreBreakdown: SelectionScoreBreakdown
  reasonCodes: SelectionReasonCode[]
  internalReasons: string[]
  publicReasons: string[]
  requiresHumanReview: boolean
  policyVersion: string
}

export type RankedSelectionApplication = SelectionAssessment & {
  country: string
  overallRank: number
  countryRank: number
}

export type SelectionReportApplication = {
  applicationId: string
  fullName: string
  country: string | null
  verdict: SelectionVerdict
  totalScore: number
  publicReasons: string[]
}

export type SelectionReport = {
  title: string
  generatedAt: string
  cycleName: string
  sourceLabel: string
  summary: {
    totalApplications: number
    processedApplications: number
    qualified: number
    notQualified: number
    needsReview: number
    batchNumber: number
    totalBatches: number
  }
  applications: SelectionReportApplication[]
}

export type ApplicantResultView = {
  cycleName: string
  applicantName: string
  country: string | null
  verdict: SelectionVerdict
  isFinal: boolean
  totalScore: number
  minimumMeritScore: number
  scoreBreakdown: {
    academic: { score: number; maximum: 30 }
    leadership: { score: number; maximum: 25 }
    impact: { score: number; maximum: 25 }
    initiative: { score: number; maximum: 10 }
    communication: { score: number; maximum: 10 }
  }
  reasons: string[]
  nextStep: string
  publishedAt: string
  appeal?: {
    deadline: string
    message: string
  }
}

export type SelectionJobSummary = {
  id: string
  cycleName: string
  sourceType: SelectionSourceType
  sourceLabel: string
  status: SelectionJobStatus
  batchSize: number
  totalCount: number
  processedCount: number
  qualifiedCount: number
  notQualifiedCount: number
  needsReviewCount: number
  createdAt: string
  updatedAt: string
}
