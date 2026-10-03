export type RecoveryArea = 'admin' | 'member'

type RecoveryRequestOriginOptions = {
  browserOrigin: string
  canonicalSiteUrl: string
  isProduction: boolean
}

export function getRecoveryRequestOrigin({
  browserOrigin,
  canonicalSiteUrl,
  isProduction,
}: RecoveryRequestOriginOptions): string {
  return new URL(isProduction ? canonicalSiteUrl : browserOrigin).origin
}

export function getRecoveryRedirectUrl(origin: string, area: RecoveryArea): string {
  const url = new URL('/auth/reset-password', origin)
  url.searchParams.set('area', area)
  return url.toString()
}

export function getPostRecoveryPath(area: RecoveryArea): string {
  return area === 'admin' ? '/admin/login?reset=success' : '/login?reset=success'
}

export function passwordUpdateErrorMessage(error: { code?: string; status?: number }): string {
  if (error.code === 'same_password') return 'Choose a password different from your previous password.'
  if (error.code === 'weak_password') return 'Choose a stronger password with at least 8 characters. Avoid common or compromised passwords.'
  if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (error.code === 'session_not_found' || error.code === 'refresh_token_not_found' || error.status === 401 || error.status === 403) {
    return 'This reset link is invalid or has expired. Request a new one and try again.'
  }
  return 'We could not update your password. Please try again shortly.'
}
