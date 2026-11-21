import { NextResponse, type NextRequest } from 'next/server'

export const PLAY_DISTRIBUTION_COOKIE = 'top100-play'
const playPackage = 'android-app://com.top100afl.app'

type CookieReader = { get(name: string): { value: string } | undefined }

export function isAndroidPlaySession(cookies: CookieReader) {
  return cookies.get(PLAY_DISTRIBUTION_COOKIE)?.value === '1'
}

// This marker only disables checkout. It does not grant access or authenticate the app.
export function androidPlayLaunchResponse(request: NextRequest) {
  if (request.method !== 'GET' || request.nextUrl.pathname.startsWith('/api/')) return null

  const url = request.nextUrl.clone()
  const marked = url.searchParams.getAll('distribution').includes('google-play')
  const referrer = request.headers.get('referer')
  const fromPlayApp = referrer === playPackage || referrer === playPackage + '/'
  if (!marked && (!fromPlayApp || isAndroidPlaySession(request.cookies))) return null

  url.searchParams.delete('distribution')
  const response = NextResponse.redirect(url)
  response.headers.set('Cache-Control', 'private, no-store')
  response.cookies.set(PLAY_DISTRIBUTION_COOKIE, '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    maxAge: 30 * 24 * 60 * 60,
  })
  return response
}
