export const DEV_DASHBOARD_EMAIL = 'demo@top100.local'
export const DEV_DASHBOARD_PASSWORD = 'Top100Demo!2026'
export const DEV_DASHBOARD_COOKIE = 'top100-local-dashboard-demo'
export const DEV_DASHBOARD_COOKIE_VALUE = 'top100-local-dashboard-demo-v1'

export type DemoCredentialClassification =
  | 'authenticated'
  | 'invalid-demo-password'
  | 'not-demo'

type RequestLike = {
  headers: { get(name: string): string | null }
  cookies?: { get(name: string): { value: string } | undefined }
}

function hostnameFromHostHeader(hostHeader: string): string {
  const host = hostHeader.trim().toLowerCase()
  if (host.startsWith('[')) {
    const closingBracket = host.indexOf(']')
    return closingBracket >= 0 ? host.slice(0, closingBracket + 1) : host
  }
  return host.split(':', 1)[0]
}

export function isLoopbackDevelopment(
  request: Pick<RequestLike, 'headers'>,
  environment = process.env.NODE_ENV,
): boolean {
  if (environment !== 'development') return false

  const hostname = hostnameFromHostHeader(request.headers.get('host') ?? '')
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
}

export function classifyDemoCredentials(
  email: string,
  password: string,
): DemoCredentialClassification {
  if (email.trim().toLowerCase() !== DEV_DASHBOARD_EMAIL) return 'not-demo'
  return password === DEV_DASHBOARD_PASSWORD ? 'authenticated' : 'invalid-demo-password'
}

export function hasValidDemoSession(
  request: RequestLike,
  environment = process.env.NODE_ENV,
): boolean {
  return (
    isLoopbackDevelopment(request, environment) &&
    request.cookies?.get(DEV_DASHBOARD_COOKIE)?.value === DEV_DASHBOARD_COOKIE_VALUE
  )
}
