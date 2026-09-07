import { describe, expect, it } from 'vitest'

import { decideSelectionTaskFailure } from '@/lib/selection/worker-policy'

describe('decideSelectionTaskFailure', () => {
  it('retries transient failures with bounded exponential backoff', () => {
    expect(decideSelectionTaskFailure({ attemptCount: 1, permanent: false })).toEqual({
      status: 'retry',
      delaySeconds: 60,
      requiresHumanReview: false,
    })
    expect(decideSelectionTaskFailure({ attemptCount: 2, permanent: false })).toEqual({
      status: 'retry',
      delaySeconds: 120,
      requiresHumanReview: false,
    })
  })

  it('stops retrying after three attempts and routes the application to review', () => {
    expect(decideSelectionTaskFailure({ attemptCount: 3, permanent: false })).toEqual({
      status: 'failed',
      delaySeconds: 0,
      requiresHumanReview: true,
    })
  })

  it('fails permanent document errors immediately', () => {
    expect(decideSelectionTaskFailure({ attemptCount: 1, permanent: true })).toEqual({
      status: 'failed',
      delaySeconds: 0,
      requiresHumanReview: true,
    })
  })
})
