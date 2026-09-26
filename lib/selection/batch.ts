import { SELECTION_BATCH_SIZE } from './contracts'

export type SelectionBatchPlan = {
  start: number
  endExclusive: number
  size: number
  batchNumber: number
  totalBatches: number
  nextProcessedCount: number
  hasMore: boolean
}

type PlanSelectionBatchInput = {
  totalCount: number
  processedCount: number
  requestedBatchSize?: number
}

const assertNonNegativeInteger = (value: number, field: string) => {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer`)
  }
}

export function planSelectionBatch({
  totalCount,
  processedCount,
  requestedBatchSize = SELECTION_BATCH_SIZE,
}: PlanSelectionBatchInput): SelectionBatchPlan {
  assertNonNegativeInteger(totalCount, 'totalCount')
  assertNonNegativeInteger(processedCount, 'processedCount')

  if (processedCount > totalCount) {
    throw new Error('processedCount cannot exceed totalCount')
  }

  if (!Number.isFinite(requestedBatchSize) || requestedBatchSize <= 0) {
    throw new Error('requestedBatchSize must be greater than zero')
  }

  const batchSize = Math.min(SELECTION_BATCH_SIZE, Math.max(1, Math.floor(requestedBatchSize)))
  const totalBatches = totalCount === 0 ? 0 : Math.ceil(totalCount / batchSize)
  const start = processedCount
  const endExclusive = Math.min(totalCount, start + batchSize)
  const size = Math.max(0, endExclusive - start)
  const batchNumber = totalBatches === 0 ? 0 : Math.min(totalBatches, Math.floor(start / batchSize) + 1)
  const nextProcessedCount = endExclusive

  return {
    start,
    endExclusive,
    size,
    batchNumber,
    totalBatches,
    nextProcessedCount,
    hasMore: nextProcessedCount < totalCount,
  }
}

export function sliceSelectionBatch<T>(
  applications: readonly T[],
  processedCount: number,
  requestedBatchSize = SELECTION_BATCH_SIZE,
): { items: T[]; plan: SelectionBatchPlan } {
  const plan = planSelectionBatch({
    totalCount: applications.length,
    processedCount,
    requestedBatchSize,
  })

  return {
    items: applications.slice(plan.start, plan.endExclusive),
    plan,
  }
}
