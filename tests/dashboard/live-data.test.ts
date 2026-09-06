import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { fetchMemberHubState } from '@/lib/member-hub'
import { GET } from '@/app/dev/dashboard/route'
import { DEV_DASHBOARD_COOKIE } from '@/lib/dev-dashboard/auth'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('does not invent opportunities when the member API contains no listings', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ member: null, notifications: [], featureSubmissions: [] })))
  expect((await fetchMemberHubState()).opportunities).toEqual([])
})

it('retires the preview session and sends visitors through real authentication', () => {
  vi.stubEnv('NODE_ENV', 'development')
  const response = GET(new NextRequest('http://localhost:3100/dev/dashboard', { headers: { host: 'localhost:3100' } }))
  expect(response.headers.get('location')).toBe('http://localhost:3100/login?redirect=/dashboard')
  expect(response.cookies.get(DEV_DASHBOARD_COOKIE)?.value).toBe('')
})
