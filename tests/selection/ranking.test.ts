import { describe, expect, it } from 'vitest'

import { rankSelectionAssessments } from '@/lib/selection/ranking'
import type { SelectionAssessment } from '@/lib/selection/contracts'

const assessment = (overrides: Partial<SelectionAssessment> = {}): SelectionAssessment => ({
  applicationId: 'application-1',
  fullName: 'Applicant One',
  country: 'Nigeria',
  verdict: 'qualified',
  totalScore: 75,
  scoreBreakdown: {
    academic: 28,
    leadership: 18,
    impact: 15,
    initiative: 7,
    communication: 7,
  },
  reasonCodes: ['MERIT_THRESHOLD_MET'],
  internalReasons: [],
  publicReasons: ['The application met the published eligibility and merit requirements.'],
  requiresHumanReview: false,
  policyVersion: '2026.1',
  ...overrides,
})

describe('rankSelectionAssessments', () => {
  it('ranks only qualified applications and assigns country ranks separately', () => {
    const ranked = rankSelectionAssessments([
      assessment({ applicationId: 'n2', fullName: 'Ngozi B', country: 'Nigeria', totalScore: 81 }),
      assessment({ applicationId: 'g1', fullName: 'Ama A', country: 'Ghana', totalScore: 84 }),
      assessment({ applicationId: 'n1', fullName: 'Amina A', country: 'Nigeria', totalScore: 90 }),
      assessment({ applicationId: 'r1', fullName: 'Review Me', verdict: 'needs_review', totalScore: 95 }),
      assessment({ applicationId: 'x1', fullName: 'Not Eligible', verdict: 'not_qualified', totalScore: 99 }),
    ])

    expect(ranked.map((entry) => entry.applicationId)).toEqual(['n1', 'g1', 'n2'])
    expect(ranked.map((entry) => entry.overallRank)).toEqual([1, 2, 3])
    expect(ranked.find((entry) => entry.applicationId === 'n1')?.countryRank).toBe(1)
    expect(ranked.find((entry) => entry.applicationId === 'n2')?.countryRank).toBe(2)
    expect(ranked.find((entry) => entry.applicationId === 'g1')?.countryRank).toBe(1)
  })

  it('uses published score components and then name and id as deterministic tie-breakers', () => {
    const ranked = rankSelectionAssessments([
      assessment({
        applicationId: 'b-id',
        fullName: 'Beta Person',
        totalScore: 80,
        scoreBreakdown: { academic: 28, leadership: 20, impact: 16, initiative: 8, communication: 8 },
      }),
      assessment({
        applicationId: 'z-id',
        fullName: 'Zara Person',
        totalScore: 80,
        scoreBreakdown: { academic: 29, leadership: 19, impact: 16, initiative: 8, communication: 8 },
      }),
      assessment({
        applicationId: 'a-id',
        fullName: 'Alpha Person',
        totalScore: 80,
        scoreBreakdown: { academic: 28, leadership: 20, impact: 16, initiative: 8, communication: 8 },
      }),
    ])

    expect(ranked.map((entry) => entry.applicationId)).toEqual(['z-id', 'a-id', 'b-id'])
  })

  it('normalizes country names before assigning country ranks', () => {
    const ranked = rankSelectionAssessments([
      assessment({ applicationId: 'a', fullName: 'A', country: ' nigeria ', totalScore: 90 }),
      assessment({ applicationId: 'b', fullName: 'B', country: 'NIGERIA', totalScore: 80 }),
    ])

    expect(ranked.map((entry) => entry.country)).toEqual(['Nigeria', 'Nigeria'])
    expect(ranked.map((entry) => entry.countryRank)).toEqual([1, 2])
  })
})
