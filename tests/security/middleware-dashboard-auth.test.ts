import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEV_DASHBOARD_COOKIE, DEV_DASHBOARD_COOKIE_VALUE } from '@/lib/dev-dashboard/auth'
import { updateSession } from '@/utils/supabase/middleware'

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: { claims: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  }),
}))

function dashboardRequest(cookieValue?: string) {
  const headers = new Headers({ host: 'localhost:3000' })
  if (cookieValue !== undefined) {
    headers.set('cookie', `${DEV_DASHBOARD_COOKIE}=${cookieValue}`)
  }
  return new NextRequest('http://localhost:3000/dashboard/messages?tab=unread', { headers })
}

function memberApiRequest(cookieValue: string) {
  return new NextRequest('http://localhost:3000/api/member/me', {
    headers: {
      host: 'localhost:3000',
      cookie: `${DEV_DASHBOARD_COOKIE}=${cookieValue}`,
    },
  })
}

describe('dashboard middleware authentication boundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('redirects a placeholder-key dashboard request without a demo cookie', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-local-dev-key')

    const response = await updateSession(dashboardRequest())

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fdashboard%2Fmessages',
    )
  })

  it('admits and rewrites requests with the exact demo cookie', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-local-dev-key')

    const dashboard = await updateSession(dashboardRequest(DEV_DASHBOARD_COOKIE_VALUE))
    expect(dashboard.status).toBe(200)
    expect(dashboard.headers.get('x-middleware-next')).toBe('1')

    const memberApi = await updateSession(memberApiRequest(DEV_DASHBOARD_COOKIE_VALUE))
    expect(memberApi.status).toBe(200)
    expect(memberApi.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3000/api/dev-dashboard/me',
    )
  })

  it('redirects a placeholder-key dashboard request with an invalid demo cookie', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-local-dev-key')

    const response = await updateSession(dashboardRequest('forged-demo-cookie'))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fdashboard%2Fmessages',
    )
  })
})
