import { NextResponse } from 'next/server'

function normalizedOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

/** Trust only the request origin and the explicitly configured public site.
 * The apex and www Top100 domains both route to this application in production.
 * Never trust a client-supplied forwarded host to expand this list.
 */
export function isTrustedRequestOrigin(request: Request): boolean {
  const allowedOrigins = new Set<string>([new URL(request.url).origin])
  // The production proxy can expose an internal request URL and Dokploy's
  // service environment may be read-only. These are the only public origins
  // that route to this application.
  if (process.env.NODE_ENV !== 'development') {
    allowedOrigins.add('https://top100afl.com')
    allowedOrigins.add('https://www.top100afl.com')
  }
  if (process.env.NODE_ENV === 'development') {
    for (const value of (process.env.TOP100_DEV_ORIGINS ?? '').split(',')) {
      const origin = normalizedOrigin(value.trim())
      if (origin) allowedOrigins.add(origin)
    }
  }
  // Prefer a server-only runtime setting so reverse-proxy deployments can
  // configure the public origin without relying on a NEXT_PUBLIC_* value that
  // Next.js may inline at build time.
  const configuredOrigin = normalizedOrigin(
    process.env.TOP100_SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  )
  if (configuredOrigin) {
    allowedOrigins.add(configuredOrigin)
    const publicUrl = new URL(configuredOrigin)
    if (publicUrl.hostname === 'top100afl.com' || publicUrl.hostname === 'www.top100afl.com') {
      publicUrl.hostname = publicUrl.hostname === 'top100afl.com' ? 'www.top100afl.com' : 'top100afl.com'
      allowedOrigins.add(publicUrl.origin)
    }
  }
  const requestOrigin = normalizedOrigin(request.headers.get('origin') || request.headers.get('referer'))
  return request.headers.get('sec-fetch-site') !== 'cross-site' && !!requestOrigin && allowedOrigins.has(requestOrigin)
}

/** Cookie sessions require origin evidence; bearer API clients do not borrow
 * a victim's browser cookies and can omit browser-only origin headers. */
export function rejectCrossOriginMutation(request: Request): NextResponse | null {
  if (!request.headers.get('cookie')) return null
  if (request.headers.get('authorization')?.toLowerCase().startsWith('bearer ')) return null
  if (!isTrustedRequestOrigin(request)) {
    return NextResponse.json({ message: 'Cross-origin request blocked.' }, { status: 403 })
  }
  return null
}
