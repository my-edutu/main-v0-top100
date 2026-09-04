import { NextRequest, NextResponse } from 'next/server'

import {
  DEV_DASHBOARD_COOKIE,
  DEV_DASHBOARD_COOKIE_VALUE,
  classifyDemoCredentials,
  hasValidDemoSession,
  isLoopbackDevelopment,
} from '@/lib/dev-dashboard/auth'

export const runtime = 'nodejs'

const COOKIE_MAX_AGE_SECONDS = 4 * 60 * 60

function unavailable() {
  return NextResponse.json({ message: 'Not found.' }, { status: 404 })
}

export async function POST(request: NextRequest) {
  if (!isLoopbackDevelopment(request)) return unavailable()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const classification = classifyDemoCredentials(
    String(body.email ?? ''),
    String(body.password ?? ''),
  )

  if (classification === 'not-demo') {
    return NextResponse.json({ demo: false })
  }
  if (classification === 'invalid-demo-password') {
    return NextResponse.json(
      { demo: true, message: 'Invalid email or password.' },
      { status: 401 },
    )
  }

  const response = NextResponse.json({ demo: true })
  response.cookies.set(DEV_DASHBOARD_COOKIE, DEV_DASHBOARD_COOKIE_VALUE, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })
  return response
}

export async function DELETE(request: NextRequest) {
  if (!isLoopbackDevelopment(request)) return unavailable()

  const response = NextResponse.json({ ok: true, demo: hasValidDemoSession(request) })
  response.cookies.set(DEV_DASHBOARD_COOKIE, '', {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
