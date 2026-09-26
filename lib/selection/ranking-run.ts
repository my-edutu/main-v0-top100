import { createHash } from 'node:crypto'

import type { RankedSelectionApplication, SelectionAssessment } from './contracts'
import { rankSelectionAssessments } from './ranking'

export type RankingSelectionStatus =
  | 'proposed_winner'
  | 'reserve'
  | 'eligible_not_selected'

export type SelectionRankingEntry = RankedSelectionApplication & {
  selectionStatus: RankingSelectionStatus
}

export type SelectionRankingSnapshot = {
  cycleId: string
  policyVersion: string
  winnerTarget: number
  reserveTarget: number
  checksum: string
  entries: SelectionRankingEntry[]
  summary: {
    eligibleCount: number
    proposedWinnerCount: number
    reserveCount: number
    countriesRepresented: number
  }
}

type RankingInput = {
  cycleId: string
  policyVersion: string
  winnerTarget: number
  reserveTarget: number
  assessments: readonly SelectionAssessment[]
}

const assertTarget = (value: number, name: string, allowZero = false) => {
  const minimum = allowZero ? 0 : 1
  if (!Number.isInteger(value) || value < minimum || value > 10_000) {
    throw new Error(`${name} must be an integer between ${minimum} and 10000`)
  }
}

const canonicalAssessment = (assessment: SelectionAssessment) => ({
  applicationId: assessment.applicationId,
  fullName: assessment.fullName.trim(),
  country: assessment.country?.trim() || null,
  verdict: assessment.verdict,
  totalScore: assessment.totalScore,
  scoreBreakdown: {
    academic: assessment.scoreBreakdown.academic,
    leadership: assessment.scoreBreakdown.leadership,
    impact: assessment.scoreBreakdown.impact,
    initiative: assessment.scoreBreakdown.initiative,
    communication: assessment.scoreBreakdown.communication,
  },
  requiresHumanReview: assessment.requiresHumanReview,
  policyVersion: assessment.policyVersion,
})

export function computeSelectionRankingChecksum({
  cycleId,
  policyVersion,
  winnerTarget,
  reserveTarget,
  assessments,
}: RankingInput) {
  const canonical = {
    cycleId: cycleId.trim(),
    policyVersion: policyVersion.trim(),
    winnerTarget,
    reserveTarget,
    assessments: assessments
      .map(canonicalAssessment)
      .sort((left, right) => left.applicationId.localeCompare(right.applicationId, 'en')),
  }

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

export function buildSelectionRankingSnapshot(input: RankingInput): SelectionRankingSnapshot {
  const cycleId = input.cycleId.trim()
  const policyVersion = input.policyVersion.trim()
  if (!cycleId) throw new Error('cycleId is required')
  if (!policyVersion) throw new Error('policyVersion is required')
  assertTarget(input.winnerTarget, 'winnerTarget')
  assertTarget(input.reserveTarget, 'reserveTarget', true)

  const qualified = input.assessments.filter(
    (assessment) => assessment.verdict === 'qualified' && !assessment.requiresHumanReview,
  )
  const mismatched = qualified.filter(
    (assessment) => assessment.policyVersion !== policyVersion,
  )
  if (mismatched.length > 0) {
    throw new Error(
      `Qualified assessments must use ranking policy version ${policyVersion}; ${mismatched.length} application(s) use another policy version`,
    )
  }

  const ranked = rankSelectionAssessments(qualified)
  const entries = ranked.map((entry, index): SelectionRankingEntry => {
    const selectionStatus: RankingSelectionStatus =
      index < input.winnerTarget
        ? 'proposed_winner'
        : index < input.winnerTarget + input.reserveTarget
          ? 'reserve'
          : 'eligible_not_selected'

    return { ...entry, selectionStatus }
  })

  return {
    cycleId,
    policyVersion,
    winnerTarget: input.winnerTarget,
    reserveTarget: input.reserveTarget,
    checksum: computeSelectionRankingChecksum({
      ...input,
      cycleId,
      policyVersion,
    }),
    entries,
    summary: {
      eligibleCount: entries.length,
      proposedWinnerCount: entries.filter(
        (entry) => entry.selectionStatus === 'proposed_winner',
      ).length,
      reserveCount: entries.filter((entry) => entry.selectionStatus === 'reserve').length,
      countriesRepresented: new Set(entries.map((entry) => entry.country)).size,
    },
  }
}
