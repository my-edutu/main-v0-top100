import type { SelectionPolicy, SelectionVerdict } from './contracts'

/** A reviewer attestation, not an automated identity-proofing result. */
export type SelectionReviewVerification = {
  academicOutcome: 'first_class' | 'approved_equivalent' | 'requirement_not_met' | 'unconfirmed'
  identityConfirmed: boolean
  academicEvidenceAuthenticated: boolean
  leadershipEvidenceReviewed: boolean
  noConflictOfInterest: boolean
  evidenceReference: string
  equivalenceReference: string
}

export function assertSelectionPolicy(policy: SelectionPolicy): void {
  if (
    !policy || !Number.isFinite(policy.minimumMeritScore) ||
    policy.minimumMeritScore < 0 || policy.minimumMeritScore > 100 ||
    policy.academicRequirement !== 'first_class_or_equivalent' ||
    policy.requireVerifiedAcademicEvidence !== true ||
    typeof policy.version !== 'string' || !policy.version.trim()
  ) {
    throw new Error('A valid, versioned policy requiring verified academic evidence is required')
  }
}

export function assertReviewVerification(
  verdict: SelectionVerdict,
  verification?: SelectionReviewVerification,
): void {
  if (!['qualified', 'not_qualified', 'needs_review'].includes(verdict)) {
    throw new Error('Unknown review verdict')
  }
  // Saving an unresolved case is always possible; it never authorises publication.
  if (verdict === 'needs_review') return
  if (!verification || verification.noConflictOfInterest !== true) {
    throw new Error('Declare no conflict of interest before making a final decision')
  }
  if (
    verification.identityConfirmed !== true ||
    verification.academicEvidenceAuthenticated !== true ||
    verification.leadershipEvidenceReviewed !== true
  ) {
    throw new Error('Confirm applicant identity, academic authenticity and merit evidence, or keep the case in review')
  }
  if (
    typeof verification.evidenceReference !== 'string' ||
    verification.evidenceReference.trim().length < 20 ||
    verification.evidenceReference.trim().length > 2000
  ) {
    throw new Error('Record the evidence source, verification method and reference (20–2000 characters)')
  }
  const outcome = verification.academicOutcome
  if (!['first_class', 'approved_equivalent', 'requirement_not_met'].includes(outcome)) {
    throw new Error('Unconfirmed academic eligibility requires further review, not a final decision')
  }
  if (verdict === 'qualified' && outcome === 'requirement_not_met') {
    throw new Error('A high merit score cannot override the academic eligibility requirement')
  }
  if (
    outcome === 'approved_equivalent' &&
    (typeof verification.equivalenceReference !== 'string' ||
      verification.equivalenceReference.trim().length < 10 ||
      verification.equivalenceReference.trim().length > 600)
  ) {
    throw new Error('Record the approved institution-specific equivalence rule and version')
  }
}
