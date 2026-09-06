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

  it('requires a durable Cloudflare queue when R2 is selected for production generation', () => {
    expect(
      portfolioCoverConfig({
        NODE_ENV: 'production',
        PORTFOLIO_IMAGE_GENERATION_ENABLED: 'true',
        OPENAI_API_KEY: 'openai',
        PORTFOLIO_SOURCE_BUCKET: 'portfolio-sources',
        PORTFOLIO_OPTION_BUCKET: 'portfolio-options',
        PORTFOLIO_COVER_BUCKET: 'portfolio-covers',
        MEDIA_STORAGE_PROVIDER: 'r2',
        CLOUDFLARE_R2_ACCOUNT_ID: 'account',
        CLOUDFLARE_R2_ACCESS_KEY_ID: 'access',
        CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret',
        CLOUDFLARE_R2_BUCKET: 'top100-media',
        CLOUDFLARE_R2_PRIVATE_BUCKET: 'top100-private',
        CLOUDFLARE_R2_PUBLIC_URL: 'https://media.example.com',
      }),
    ).toEqual({ enabled: false, demo: false, reason: 'missing_queue' })
  })
})
