export type RuntimeEnvironment = Record<string, string | undefined>

export type ReadinessIssue = { key: string; message: string }
export type ReadinessOptions = { requireAwards?: boolean; requireMagazine?: boolean; requirePortfolioImages?: boolean }

const CORE_SETTINGS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'TURNSTILE_SECRET_KEY',
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'ADMIN_NOTIFICATION_EMAIL',
] as const

const GIG_SETTINGS = [
  'GIG_API_BASE_URL',
  'GIG_API_USERNAME',
  'GIG_API_PASSWORD',
  'GIG_SENDER_NAME',
  'GIG_SENDER_PHONE',
  'GIG_SENDER_ADDRESS',
  'GIG_SENDER_CITY',
] as const

// Award-fee launch is owned by Bachs. Courier configuration belongs to the
// later delivery phase and is therefore deliberately kept out of this gate.
const BACHS_SHARED_SETTINGS = [
  'BACHS_API_BASE_URL',
  'BACHS_API_KEY',
  'BACHS_ORGANIZATION_ID',
  'BACHS_CHECKOUT_HOSTS',
] as const

const PORTFOLIO_SETTINGS = [
  'OPENAI_API_KEY',
  'PORTFOLIO_SOURCE_BUCKET',
  'PORTFOLIO_OPTION_BUCKET',
  'PORTFOLIO_COVER_BUCKET',
] as const

const R2_SETTINGS = [
  'CLOUDFLARE_R2_ACCOUNT_ID',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
  'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
  'CLOUDFLARE_R2_BUCKET',
  'CLOUDFLARE_R2_PRIVATE_BUCKET',
  'CLOUDFLARE_R2_PUBLIC_URL',
] as const

const PORTFOLIO_QUEUE_SETTINGS = [
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_QUEUE_ID',
  'CLOUDFLARE_API_TOKEN',
  'PORTFOLIO_WORKER_SECRET',
] as const

function present(env: RuntimeEnvironment, key: string) {
  return Boolean(env[key]?.trim())
}

function enabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true'
}

function isProductionUrl(value: string | undefined, expectedHostSuffix?: string) {
  if (!value) return false
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      url.hostname !== 'localhost' &&
      !url.hostname.endsWith('.localhost') &&
      (!expectedHostSuffix || url.hostname.endsWith(expectedHostSuffix))
    )
  } catch {
    return false
  }
}

export function evaluateProductionReadiness(
  env: RuntimeEnvironment,
  options: ReadinessOptions = {},
) {
  const issues: ReadinessIssue[] = []

  for (const key of CORE_SETTINGS) {
    if (!present(env, key)) issues.push({ key, message: `${key} is required.` })
  }

  if (
    present(env, 'NEXT_PUBLIC_SUPABASE_URL') &&
    !isProductionUrl(env.NEXT_PUBLIC_SUPABASE_URL, '.supabase.co')
  ) {
    issues.push({
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      message: 'NEXT_PUBLIC_SUPABASE_URL must be an HTTPS Supabase project URL.',
    })
  }

  if (
    present(env, 'NEXT_PUBLIC_SITE_URL') &&
    !isProductionUrl(env.NEXT_PUBLIC_SITE_URL)
  ) {
    issues.push({
      key: 'NEXT_PUBLIC_SITE_URL',
      message: 'NEXT_PUBLIC_SITE_URL must be the public HTTPS site origin.',
    })
  }

  if (options.requireAwards && !enabled(env.AWARD_CHECKOUT_ENABLED)) {
    issues.push({
      key: 'AWARD_CHECKOUT_ENABLED',
      message: 'AWARD_CHECKOUT_ENABLED must be true for the full award-fee launch scope.',
    })
  }

  if (options.requireMagazine && !enabled(env.MAGAZINE_CHECKOUT_ENABLED)) {
    issues.push({
      key: 'MAGAZINE_CHECKOUT_ENABLED',
      message: 'MAGAZINE_CHECKOUT_ENABLED must be true for the requested magazine-payment launch scope.',
    })
  }

  const awardFeeLaunchRequested = options.requireAwards || enabled(env.AWARD_CHECKOUT_ENABLED)
  const magazineLaunchRequested = options.requireMagazine || enabled(env.MAGAZINE_CHECKOUT_ENABLED)

  if (awardFeeLaunchRequested || magazineLaunchRequested) {
    for (const key of BACHS_SHARED_SETTINGS) {
      if (!present(env, key)) issues.push({ key, message: `${key} is required when a Bachs checkout is enabled.` })
    }
  }

  if (awardFeeLaunchRequested && !present(env, 'BACHS_AWARD_WEBHOOK_SECRET')) {
    issues.push({ key: 'BACHS_AWARD_WEBHOOK_SECRET', message: 'BACHS_AWARD_WEBHOOK_SECRET is required when award checkout is enabled.' })
  }

  if (magazineLaunchRequested && !present(env, 'BACHS_MAGAZINE_WEBHOOK_SECRET')) {
    issues.push({ key: 'BACHS_MAGAZINE_WEBHOOK_SECRET', message: 'BACHS_MAGAZINE_WEBHOOK_SECRET is required when magazine checkout is enabled.' })
  }

  if (options.requirePortfolioImages && !enabled(env.PORTFOLIO_IMAGE_GENERATION_ENABLED)) {
    issues.push({
      key: 'PORTFOLIO_IMAGE_GENERATION_ENABLED',
      message: 'PORTFOLIO_IMAGE_GENERATION_ENABLED must be true for the portfolio cover launch scope.',
    })
  }

  if (options.requirePortfolioImages || enabled(env.PORTFOLIO_IMAGE_GENERATION_ENABLED)) {
    for (const key of PORTFOLIO_SETTINGS) {
      if (!present(env, key)) issues.push({ key, message: `${key} is required when portfolio image generation is enabled.` })
    }
  }

  if (env.MEDIA_STORAGE_PROVIDER?.trim().toLowerCase() === 'r2') {
    for (const key of R2_SETTINGS) {
      if (!present(env, key)) issues.push({ key, message: `${key} is required when R2 media storage is enabled.` })
    }
  }

  if (
    env.MEDIA_STORAGE_PROVIDER?.trim().toLowerCase() === 'r2' &&
    (options.requirePortfolioImages || enabled(env.PORTFOLIO_IMAGE_GENERATION_ENABLED))
  ) {
    for (const key of PORTFOLIO_QUEUE_SETTINGS) {
      if (!present(env, key)) issues.push({ key, message: `${key} is required for queued portfolio generation.` })
    }
  }

  if (enabled(env.GIG_ENABLED)) {
    for (const key of GIG_SETTINGS) {
      if (!present(env, key)) issues.push({ key, message: `${key} is required when GIG is enabled.` })
    }
  }

  return { ready: issues.length === 0, issues }
}

export function isAwardCheckoutEnabled(env: RuntimeEnvironment) {
  return enabled(env.AWARD_CHECKOUT_ENABLED)
    && BACHS_SHARED_SETTINGS.every((key) => present(env, key))
    && present(env, 'BACHS_AWARD_WEBHOOK_SECRET')
}

export function isMagazineCheckoutEnabled(env: RuntimeEnvironment) {
  return enabled(env.MAGAZINE_CHECKOUT_ENABLED)
    && BACHS_SHARED_SETTINGS.every((key) => present(env, key))
    && present(env, 'BACHS_MAGAZINE_WEBHOOK_SECRET')
}

export function captchaVerificationAllowed(env: RuntimeEnvironment, nodeEnv: string | undefined) {
  return present(env, 'TURNSTILE_SECRET_KEY') || nodeEnv !== 'production'
}
