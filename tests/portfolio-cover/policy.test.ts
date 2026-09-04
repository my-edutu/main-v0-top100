import { describe, expect, it } from 'vitest'

import {
  canCreatePortfolioGeneration,
  canRetryPortfolioGeneration,
  canResetPortfolioGeneration,
} from '@/lib/portfolio-cover/policy'

describe('portfolio cover generation policy', () => {
  it('allows one generation when there is no active or successful set', () => {
    expect(canCreatePortfolioGeneration({ active: false, successful: false, attempts: 0 })).toBe(true)
    expect(canCreatePortfolioGeneration({ active: true, successful: false, attempts: 0 })).toBe(false)
    expect(canCreatePortfolioGeneration({ active: false, successful: true, attempts: 1 })).toBe(false)
  })

  it('allows exactly one retry after a failed attempt', () => {
    expect(canRetryPortfolioGeneration({ status: 'failed', attempts: 1 })).toBe(true)
    expect(canRetryPortfolioGeneration({ status: 'failed', attempts: 2 })).toBe(false)
    expect(canRetryPortfolioGeneration({ status: 'ready', attempts: 1 })).toBe(false)
  })

  it('only lets an administrator reset a finished or rejected set', () => {
    expect(canResetPortfolioGeneration({ isAdmin: true, status: 'ready' })).toBe(true)
    expect(canResetPortfolioGeneration({ isAdmin: true, status: 'rejected' })).toBe(true)
    expect(canResetPortfolioGeneration({ isAdmin: false, status: 'ready' })).toBe(false)
    expect(canResetPortfolioGeneration({ isAdmin: true, status: 'processing' })).toBe(false)
  })
})
