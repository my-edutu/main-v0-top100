import { NextResponse, type NextRequest } from 'next/server'

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

/**
 * Reject cross-site browser mutations that authenticate through cookies.
 * Bearer clients are not CSRF-sensitive, and requests without cookies cannot
 * borrow a victim's browser session. Origin falls back to Referer for browsers
 * that omit Origin on a same-site request.
 */
export function rejectCrossOriginMutation(request: NextRequest): NextResponse | null {
  if (!request.headers.get('cookie')) return null

  const authorization = request.headers.get('authorization')
  if (authorization?.toLowerCase().startsWith('bearer ')) return null

  const allowedOrigins = new Set<string>([request.nextUrl.origin])
  const configuredOrigin = normalizedOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  if (configuredOrigin) allowedOrigins.add(configuredOrigin)

  const originHeader = request.headers.get('origin')
  const requestOrigin = normalizedOrigin(originHeader || request.headers.get('referer'))
  const explicitlyCrossSite = request.headers.get('sec-fetch-site') === 'cross-site'

  if (!requestOrigin || explicitlyCrossSite || !allowedOrigins.has(requestOrigin)) {
    return NextResponse.json(
      { message: 'Cross-origin request blocked.' },
      { status: 403 },
    )
  }

  return null
}
