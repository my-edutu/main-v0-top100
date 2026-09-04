import { describe, expect, it } from 'vitest'

import {
  captchaVerificationAllowed,
  evaluateProductionReadiness,
  isAwardCheckoutEnabled,
} from '@/lib/production-readiness'

const completeCoreEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'server-secret-key',
  NEXT_PUBLIC_SITE_URL: 'https://www.top100afl.com',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-public-key',
  TURNSTILE_SECRET_KEY: 'turnstile-secret-key',
  BREVO_API_KEY: 'brevo-secret-key',
  BREVO_SENDER_EMAIL: 'hello@top100afl.com',
  ADMIN_NOTIFICATION_EMAIL: 'admin@top100afl.com',
}

describe('production readiness configuration', () => {
  it('reports every missing core launch setting without exposing values', () => {
    const result = evaluateProductionReadiness({})

    expect(result.ready).toBe(false)
    expect(result.issues.map((issue) => issue.key)).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SITE_URL',
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      'TURNSTILE_SECRET_KEY',
      'BREVO_API_KEY',
      'BREVO_SENDER_EMAIL',
      'ADMIN_NOTIFICATION_EMAIL',
    ])
  })

  it('accepts a complete controlled-launch configuration with awards disabled', () => {
    expect(evaluateProductionReadiness(completeCoreEnv)).toEqual({ ready: true, issues: [] })
  })

  it('requires Paystack when award checkout is explicitly enabled', () => {
    const result = evaluateProductionReadiness({
      ...completeCoreEnv,
      AWARD_CHECKOUT_ENABLED: 'true',
    })

    expect(result.ready).toBe(false)
    expect(result.issues.map((issue) => issue.key)).toContain('PAYSTACK_SECRET_KEY')
    expect(isAwardCheckoutEnabled({ ...completeCoreEnv, AWARD_CHECKOUT_ENABLED: 'true' })).toBe(false)
    expect(
      isAwardCheckoutEnabled({
        ...completeCoreEnv,
        AWARD_CHECKOUT_ENABLED: 'true',
        PAYSTACK_SECRET_KEY: 'paystack-secret-key',
      }),
    ).toBe(true)
  })

  it('requires the full GIG credential set when live courier pricing is enabled', () => {
    const result = evaluateProductionReadiness({ ...completeCoreEnv, GIG_ENABLED: 'true' })

    expect(result.ready).toBe(false)
    expect(result.issues.map((issue) => issue.key)).toEqual([
      'GIG_API_BASE_URL',
      'GIG_API_USERNAME',
      'GIG_API_PASSWORD',
      'GIG_SENDER_NAME',
      'GIG_SENDER_PHONE',
      'GIG_SENDER_ADDRESS',
      'GIG_SENDER_CITY',
    ])
  })

  it('requires every payment and courier dependency for the full award launch scope', () => {
    const result = evaluateProductionReadiness(completeCoreEnv, { requireAwards: true })

    expect(result.ready).toBe(false)
    expect(result.issues.map((issue) => issue.key)).toEqual([
      'AWARD_CHECKOUT_ENABLED',
      'PAYSTACK_SECRET_KEY',
      'GIG_ENABLED',
      'GIG_API_BASE_URL',
      'GIG_API_USERNAME',
      'GIG_API_PASSWORD',
      'GIG_SENDER_NAME',
      'GIG_SENDER_PHONE',
      'GIG_SENDER_ADDRESS',
      'GIG_SENDER_CITY',
    ])
  })

  it('accepts the full award launch scope only when checkout and courier are complete', () => {
    const result = evaluateProductionReadiness(
      {
        ...completeCoreEnv,
        AWARD_CHECKOUT_ENABLED: 'true',
        PAYSTACK_SECRET_KEY: 'paystack-secret-key',
        GIG_ENABLED: 'true',
        GIG_API_BASE_URL: 'https://api.giglogistics.com',
        GIG_API_USERNAME: 'gig-user',
        GIG_API_PASSWORD: 'gig-password',
        GIG_SENDER_NAME: 'Top100 AFL',
        GIG_SENDER_PHONE: '+2348000000000',
        GIG_SENDER_ADDRESS: 'Launch office',
        GIG_SENDER_CITY: 'Lagos',
      },
      { requireAwards: true },
    )

    expect(result).toEqual({ ready: true, issues: [] })
  })

  it('fails CAPTCHA closed in production and permits the unconfigured local developer flow', () => {
    expect(captchaVerificationAllowed({}, 'production')).toBe(false)
    expect(captchaVerificationAllowed({}, 'development')).toBe(true)
    expect(captchaVerificationAllowed({ TURNSTILE_SECRET_KEY: 'secret' }, 'production')).toBe(true)
  })

  it('requires portfolio provider and storage configuration when image generation is enabled', () => {
    const result = evaluateProductionReadiness({
      ...completeCoreEnv,
      PORTFOLIO_IMAGE_GENERATION_ENABLED: 'true',
    }, { requirePortfolioImages: true })
    expect(result.ready).toBe(false)
    expect(result.issues.map((issue) => issue.key)).toEqual([
      'OPENAI_API_KEY',
      'PORTFOLIO_SOURCE_BUCKET',
      'PORTFOLIO_OPTION_BUCKET',
      'PORTFOLIO_COVER_BUCKET',
    ])
  })
})
