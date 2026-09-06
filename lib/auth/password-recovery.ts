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
