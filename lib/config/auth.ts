const PUBLIC_TOGGLE = process.env.NEXT_PUBLIC_ENABLE_AUTH

/**
 * Public-facing flag that can be used in client components.
 * Authentication features remain disabled unless explicitly turned on.
 */
export const PUBLIC_AUTH_ENABLED = PUBLIC_TOGGLE === 'true'

/**
 * Server-side readiness check. We enable Better Auth only when the public toggle
 * is on and the critical environment variables are present.
 */
export const SERVER_AUTH_ENABLED =
  PUBLIC_AUTH_ENABLED &&
  Boolean(process.env.BETTER_AUTH_SECRET) &&
  Boolean(process.env.BETTER_AUTH_URL)

