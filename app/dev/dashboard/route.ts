import { NextRequest, NextResponse } from 'next/server'
import { DEV_DASHBOARD_COOKIE, isLoopbackDevelopment } from '@/lib/dev-dashboard/auth'

export function GET(request: NextRequest) {
  if (!isLoopbackDevelopment(request)) {
    return NextResponse.json({ message: 'Not found.' }, { status: 404 })
  }
  const response = NextResponse.redirect(new URL('/login?redirect=/dashboard', request.url))
  response.headers.set('Cache-Control', 'no-store')
  response.cookies.set(DEV_DASHBOARD_COOKIE, '', {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0,
  })
  return response
}
