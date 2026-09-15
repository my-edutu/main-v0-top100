export type SelectionTaskFailureDecision = {
  status: 'retry' | 'failed'
  delaySeconds: number
  requiresHumanReview: boolean
}

export function decideSelectionTaskFailure({
  attemptCount,
  permanent,
}: {
  attemptCount: number
  permanent: boolean
}): SelectionTaskFailureDecision {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) {
    throw new Error('attemptCount must be a positive integer')
  }

  if (permanent || attemptCount >= 3) {
    return {
      status: 'failed',
      delaySeconds: 0,
      requiresHumanReview: true,
    }
  }

  return {
    status: 'retry',
    delaySeconds: Math.min(15 * 60, 60 * 2 ** (attemptCount - 1)),
    requiresHumanReview: false,
  }
}
