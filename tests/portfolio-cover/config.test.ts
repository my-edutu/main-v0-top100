import { describe, expect, it } from 'vitest'

import { portfolioCoverConfig } from '@/lib/portfolio-cover/config'

describe('portfolio cover configuration', () => {
  it('fails closed without the production feature flag and provider key', () => {
    expect(portfolioCoverConfig({ NODE_ENV: 'production' })).toEqual({ enabled: false, demo: false, reason: 'disabled' })
    expect(portfolioCoverConfig({ NODE_ENV: 'production', PORTFOLIO_IMAGE_GENERATION_ENABLED: 'true' })).toEqual({ enabled: false, demo: false, reason: 'missing_provider' })
  })

  it('allows only an explicit local demo editor outside production', () => {
    expect(portfolioCoverConfig({ NODE_ENV: 'development', PORTFOLIO_IMAGE_GENERATION_DEMO: 'true' })).toEqual({ enabled: true, demo: true, reason: null })
    expect(portfolioCoverConfig({ NODE_ENV: 'production', PORTFOLIO_IMAGE_GENERATION_DEMO: 'true' })).toEqual({ enabled: false, demo: false, reason: 'production_demo_forbidden' })
  })
})
