import { describe, expect, it } from 'vitest'

import {
  buildSelectionRankingSnapshot,
  computeSelectionRankingChecksum,
} from '@/lib/selection/ranking-run'
import type { SelectionAssessment } from '@/lib/selection/contracts'

const assessment = (overrides: Partial<SelectionAssessment> = {}): SelectionAssessment => ({
  applicationId: 'application-1',
  fullName: 'Applicant One',
  country: 'Nigeria',
  verdict: 'qualified',
  totalScore: 80,
  scoreBreakdown: {
    academic: 28,
    leadership: 20,
    impact: 17,
    initiative: 8,
    communication: 7,
  },
  reasonCodes: ['MERIT_THRESHOLD_MET'],
  internalReasons: [],
  publicReasons: ['The application met the published requirements.'],
  requiresHumanReview: false,
  policyVersion: '2026.1',
  ...overrides,
})

describe('buildSelectionRankingSnapshot', () => {
  it('selects the top target as proposed winners and the next target as reserves', () => {
    const snapshot = buildSelectionRankingSnapshot({
      cycleId: 'cycle-1',
      policyVersion: '2026.1',
      winnerTarget: 2,
      reserveTarget: 1,
      assessments: [
        assessment({ applicationId: 'a', fullName: 'A', totalScore: 95 }),
        assessment({ applicationId: 'b', fullName: 'B', country: 'Ghana', totalScore: 90 }),
        assessment({ applicationId: 'c', fullName: 'C', totalScore: 85 }),
        assessment({ applicationId: 'd', fullName: 'D', totalScore: 80 }),
      ],
    })

    expect(snapshot.entries.map((entry) => [entry.applicationId, entry.selectionStatus])).toEqual([
      ['a', 'proposed_winner'],
      ['b', 'proposed_winner'],
      ['c', 'reserve'],
      ['d', 'eligible_not_selected'],
    ])
    expect(snapshot.summary).toEqual({
      eligibleCount: 4,
      proposedWinnerCount: 2,
      reserveCount: 1,
      countriesRepresented: 2,
    })
  })

  it('excludes unresolved and not-qualified applications from ranking', () => {
    const snapshot = buildSelectionRankingSnapshot({
      cycleId: 'cycle-1',
      policyVersion: '2026.1',
      winnerTarget: 100,
      reserveTarget: 20,
      assessments: [
        assessment({ applicationId: 'qualified' }),
        assessment({ applicationId: 'review', verdict: 'needs_review', requiresHumanReview: true }),
        assessment({ applicationId: 'rejected', verdict: 'not_qualified' }),
      ],
    })

    expect(snapshot.entries.map((entry) => entry.applicationId)).toEqual(['qualified'])
  })

  it('fails closed when a final qualified assessment uses another policy version', () => {
    expect(() =>
      buildSelectionRankingSnapshot({
        cycleId: 'cycle-1',
        policyVersion: '2026.1',
        winnerTarget: 100,
        reserveTarget: 20,
        assessments: [
          assessment({ applicationId: 'a', policyVersion: '2026.1' }),
          assessment({ applicationId: 'b', policyVersion: '2025.3' }),
        ],
      }),
    ).toThrow('policy version')
  })

  it('rejects invalid winner and reserve targets', () => {
    expect(() =>
      buildSelectionRankingSnapshot({
        cycleId: 'cycle-1',
        policyVersion: '2026.1',
        winnerTarget: 0,
        reserveTarget: 20,
        assessments: [],
      }),
    ).toThrow('winnerTarget')
  })
})

describe('computeSelectionRankingChecksum', () => {
  it('is stable when the same assessment input arrives in a different order', () => {
    const left = [
      assessment({ applicationId: 'b', fullName: 'B', totalScore: 85 }),
      assessment({ applicationId: 'a', fullName: 'A', totalScore: 90 }),
    ]
    const right = left.slice().reverse()

    expect(
      computeSelectionRankingChecksum({
        cycleId: 'cycle-1',
        policyVersion: '2026.1',
        winnerTarget: 100,
        reserveTarget: 20,
        assessments: left,
      }),
    ).toBe(
      computeSelectionRankingChecksum({
        cycleId: 'cycle-1',
        policyVersion: '2026.1',
        winnerTarget: 100,
        reserveTarget: 20,
        assessments: right,
      }),
    )
  })

  it('changes when a score or selection target changes', () => {
    const base = {
      cycleId: 'cycle-1',
      policyVersion: '2026.1',
      winnerTarget: 100,
      reserveTarget: 20,
      assessments: [assessment({ applicationId: 'a', totalScore: 90 })],
    }

    expect(computeSelectionRankingChecksum(base)).not.toBe(
      computeSelectionRankingChecksum({
        ...base,
        assessments: [assessment({ applicationId: 'a', totalScore: 89 })],
      }),
    )
    expect(computeSelectionRankingChecksum(base)).not.toBe(
      computeSelectionRankingChecksum({ ...base, winnerTarget: 50 }),
    )
  })
})
