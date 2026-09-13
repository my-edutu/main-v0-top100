import type { BachsConfig } from './types'

export type { BachsConfig } from './types'

type Environment = Record<string, string | undefined>

const SANDBOX_URL = 'https://sandbox-api.bachs.io' as const
const PRODUCTION_URL = 'https://api.bachs.io' as const
const DEFAULT_CHECKOUT_HOST = 'checkout.bachs.io'

function required(env: Environment, name: string): string {
  const value = env[name]?.trim() ?? ''
  if (!value) throw new Error(`${name} is required for Bachs.`)
  return value
}

function parseApiBaseUrl(value: string): BachsConfig['apiBaseUrl'] {
  if (value !== SANDBOX_URL && value !== PRODUCTION_URL) {
    throw new Error(`Bachs API base URL must be exactly ${SANDBOX_URL} or ${PRODUCTION_URL}.`)
  }
  return value
}

function parseCheckoutHosts(raw: string | undefined, nodeEnv: string | undefined): ReadonlySet<string> {
  if ((raw === undefined || raw.trim() === '') && nodeEnv === 'production') {
    throw new Error('BACHS_CHECKOUT_HOSTS is required in production.')
  }
  const entries = (raw ?? DEFAULT_CHECKOUT_HOST)
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  if (entries.length === 0) throw new Error('BACHS_CHECKOUT_HOSTS must contain at least one hostname.')

  const hosts = new Set<string>()
  for (const host of entries) {
    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host) || host.includes('..')) {
      throw new Error(`BACHS_CHECKOUT_HOSTS contains an invalid hostname: ${host}`)
    }
    try {
      const parsed = new URL(`https://${host}`)
      if (parsed.hostname !== host || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash) {
        throw new Error('invalid hostname')
      }
    } catch {
      throw new Error(`BACHS_CHECKOUT_HOSTS contains an invalid hostname: ${host}`)
    }
    hosts.add(host)
  }
  return hosts
}

function parseSiteUrl(raw: string, nodeEnv: string | undefined): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be an absolute URL.')
  }

  const localDevelopment = nodeEnv === 'development' || nodeEnv === 'test'
  const localHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !(localDevelopment && localHost && url.protocol === 'http:')) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS outside local development.')
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a trusted origin without a path or query.')
  }
  return url.origin
}

function parseTolerance(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === '') return 300
  if (!/^\d+$/.test(raw.trim())) throw new Error('BACHS_WEBHOOK_TOLERANCE_SECONDS must be a positive integer.')
  const value = Number(raw.trim())
  if (!Number.isSafeInteger(value) || value <= 0 || value > 86_400) {
    throw new Error('BACHS_WEBHOOK_TOLERANCE_SECONDS must be between 1 and 86400 seconds.')
  }
  return value
}

/** Validate server-only Bachs credentials and trusted callback/checkout origins. */
export function bachsConfig(env: Environment = process.env): BachsConfig {
  const apiKey = required(env, 'BACHS_API_KEY')
  const apiBaseUrl = parseApiBaseUrl(required(env, 'BACHS_API_BASE_URL'))
  const expectedPrefix = apiBaseUrl === SANDBOX_URL ? 'sk_sandbox_' : 'sk_live_'
  if (!apiKey.startsWith(expectedPrefix) || apiKey.slice(expectedPrefix.length).trim() === '') {
    throw new Error(`BACHS_API_KEY prefix mismatch for ${apiBaseUrl}.`)
  }
  if (/\s/.test(apiKey)) throw new Error('BACHS_API_KEY must not contain whitespace.')

  const webhookSecret = required(env, 'BACHS_WEBHOOK_SECRET')
  const siteUrl = parseSiteUrl(required(env, 'NEXT_PUBLIC_SITE_URL'), env.NODE_ENV)

  return {
    apiKey,
    apiBaseUrl,
    webhookSecret,
    organizationId: env.BACHS_ORGANIZATION_ID?.trim() || null,
    webhookToleranceSeconds: parseTolerance(env.BACHS_WEBHOOK_TOLERANCE_SECONDS),
    checkoutHosts: parseCheckoutHosts(env.BACHS_CHECKOUT_HOSTS, env.NODE_ENV),
    siteUrl,
  }
}

export { SANDBOX_URL, PRODUCTION_URL }
