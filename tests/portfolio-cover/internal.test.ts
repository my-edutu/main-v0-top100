import { describe, expect, it } from 'vitest'

import { isPortfolioWorkerAuthorized } from '@/lib/portfolio-cover/internal'

describe('portfolio worker authorization', () => {
  it('accepts only the configured internal bearer secret', () => {
    expect(
      isPortfolioWorkerAuthorized('Bearer internal-secret', { PORTFOLIO_WORKER_SECRET: 'internal-secret' }),
    ).toBe(true)
    expect(
      isPortfolioWorkerAuthorized('Bearer wrong-secret', { PORTFOLIO_WORKER_SECRET: 'internal-secret' }),
    ).toBe(false)
    expect(isPortfolioWorkerAuthorized(null, { PORTFOLIO_WORKER_SECRET: 'internal-secret' })).toBe(false)
  })
})
