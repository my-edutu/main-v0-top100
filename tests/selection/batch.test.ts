import { describe, expect, it } from 'vitest'

import { planSelectionBatch, sliceSelectionBatch } from '@/lib/selection/batch'

describe('planSelectionBatch', () => {
  it('processes no more than 100 applications at a time', () => {
    expect(planSelectionBatch({ totalCount: 245, processedCount: 0 })).toEqual({
      start: 0,
      endExclusive: 100,
      size: 100,
      batchNumber: 1,
      totalBatches: 3,
      nextProcessedCount: 100,
      hasMore: true,
    })

    expect(planSelectionBatch({ totalCount: 245, processedCount: 100 })).toEqual({
      start: 100,
      endExclusive: 200,
      size: 100,
      batchNumber: 2,
      totalBatches: 3,
      nextProcessedCount: 200,
      hasMore: true,
    })

    expect(planSelectionBatch({ totalCount: 245, processedCount: 200 })).toEqual({
      start: 200,
      endExclusive: 245,
      size: 45,
      batchNumber: 3,
      totalBatches: 3,
      nextProcessedCount: 245,
      hasMore: false,
    })
  })

  it('caps an oversized requested batch at 100', () => {
    expect(planSelectionBatch({ totalCount: 500, processedCount: 0, requestedBatchSize: 250 }).size).toBe(100)
  })

  it('returns an empty terminal batch after every application is processed', () => {
    expect(planSelectionBatch({ totalCount: 25, processedCount: 25 })).toEqual({
      start: 25,
      endExclusive: 25,
      size: 0,
      batchNumber: 1,
      totalBatches: 1,
      nextProcessedCount: 25,
      hasMore: false,
    })
  })

  it('rejects invalid counters instead of silently skipping records', () => {
    expect(() => planSelectionBatch({ totalCount: -1, processedCount: 0 })).toThrow('totalCount')
    expect(() => planSelectionBatch({ totalCount: 10, processedCount: -1 })).toThrow('processedCount')
    expect(() => planSelectionBatch({ totalCount: 10, processedCount: 11 })).toThrow('processedCount')
  })
})

describe('sliceSelectionBatch', () => {
  it('returns the exact records described by the batch plan', () => {
    const applications = Array.from({ length: 205 }, (_, index) => `application-${index + 1}`)
    const batch = sliceSelectionBatch(applications, 100)

    expect(batch.items).toHaveLength(100)
    expect(batch.items[0]).toBe('application-101')
    expect(batch.items[99]).toBe('application-200')
    expect(batch.plan.nextProcessedCount).toBe(200)
  })
})
