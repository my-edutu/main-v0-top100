const DASHBOARD_ORIGIN = 'https://dashboard.invalid'
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/

export function sanitizeDashboardRedirect(
  requestedPath: string,
  fallback = '/dashboard',
): string {
  if (!requestedPath || CONTROL_CHARACTER.test(requestedPath) || requestedPath.includes('\\')) {
    return fallback
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(requestedPath)
  } catch {
    return fallback
  }

  if (
    CONTROL_CHARACTER.test(decodedPath) ||
    decodedPath.includes('\\') ||
    !requestedPath.startsWith('/') ||
    requestedPath.startsWith('//') ||
    decodedPath.startsWith('//')
  ) {
    return fallback
  }

  try {
    const url = new URL(requestedPath, DASHBOARD_ORIGIN)
    const isDashboardPath =
      url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/')
    const isContactConfirmationPath =
      /^\/contact-confirmation\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(url.pathname) &&
      !url.search && !url.hash

    if (
      url.origin !== DASHBOARD_ORIGIN ||
      url.username ||
      url.password ||
      (!isDashboardPath && !isContactConfirmationPath)
    ) {
      return fallback
    }
  } catch {
    return fallback
  }

  return requestedPath
}
