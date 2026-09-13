import { describe, expect, it } from 'vitest'

import { bachsConfig } from '@/lib/payments/bachs/config'

const baseEnv = {
  NODE_ENV: 'test',
  BACHS_API_KEY: 'sk_sandbox_test-key',
  BACHS_API_BASE_URL: 'https://sandbox-api.bachs.io',
  BACHS_WEBHOOK_SECRET: 'webhook-secret',
  BACHS_ORGANIZATION_ID: 'acct_test',
  BACHS_CHECKOUT_HOSTS: 'checkout.bachs.io, sandbox-checkout.bachs.io',
  NEXT_PUBLIC_SITE_URL: 'https://top100afl.com',
}

describe('bachsConfig', () => {
  it('validates sandbox credentials and trusted hosts', () => {
    const config = bachsConfig(baseEnv)

    expect(config.apiBaseUrl).toBe('https://sandbox-api.bachs.io')
    expect(config.apiKey).toBe('sk_sandbox_test-key')
    expect(config.webhookToleranceSeconds).toBe(300)
    expect(config.checkoutHosts).toEqual(new Set(['checkout.bachs.io', 'sandbox-checkout.bachs.io']))
    expect(config.siteUrl).toBe('https://top100afl.com')
  })

  it('rejects a key and API deployment mismatch', () => {
    expect(() => bachsConfig({ ...baseEnv, BACHS_API_KEY: 'sk_live_test-key' })).toThrow(/mismatch/i)
    expect(() => bachsConfig({ ...baseEnv, BACHS_API_BASE_URL: 'https://api.bachs.io' })).toThrow(/mismatch/i)
  })

  it('rejects unknown API roots and malformed secrets', () => {
    expect(() => bachsConfig({ ...baseEnv, BACHS_API_BASE_URL: 'https://evil.example/v1' })).toThrow(/base url/i)
    expect(() => bachsConfig({ ...baseEnv, BACHS_API_KEY: 'pk_sandbox_test-key' })).toThrow(/prefix/i)
    expect(() => bachsConfig({ ...baseEnv, BACHS_WEBHOOK_SECRET: ' ' })).toThrow(/webhook/i)
  })

  it('requires HTTPS site URLs outside local development', () => {
    expect(() => bachsConfig({ ...baseEnv, NEXT_PUBLIC_SITE_URL: 'http://top100afl.com' })).toThrow(/https/i)
    expect(() => bachsConfig({ ...baseEnv, NEXT_PUBLIC_SITE_URL: 'https://top100afl.com/path?evil=1' })).toThrow(/origin|site/i)
    expect(() => bachsConfig({ ...baseEnv, NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: undefined })).toThrow(/site/i)
  })

  it('permits localhost HTTP only in local development', () => {
    const config = bachsConfig({ ...baseEnv, NODE_ENV: 'development', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })
    expect(config.siteUrl).toBe('http://localhost:3000')
    expect(() => bachsConfig({ ...baseEnv, NODE_ENV: 'production', NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' })).toThrow(/https/i)
  })

  it('rejects invalid or empty checkout host entries', () => {
    expect(() => bachsConfig({ ...baseEnv, BACHS_CHECKOUT_HOSTS: 'https://checkout.bachs.io' })).toThrow(/host/i)
    expect(() => bachsConfig({ ...baseEnv, BACHS_CHECKOUT_HOSTS: 'checkout.bachs.io, evil.example/path' })).toThrow(/host/i)
    expect(() => bachsConfig({ ...baseEnv, BACHS_CHECKOUT_HOSTS: ' ' })).toThrow(/host/i)
  })
})
