import { describe, expect, it } from 'vitest'

import {
  DEV_DASHBOARD_COOKIE,
  DEV_DASHBOARD_COOKIE_VALUE,
  classifyDemoCredentials,
  hasValidDemoSession,
  isLoopbackDevelopment,
} from '@/lib/dev-dashboard/auth'

function requestLike(host: string, cookie?: string) {
  return {
    headers: new Headers({ host }),
    cookies: {
      get(name: string) {
        return name === DEV_DASHBOARD_COOKIE && cookie ? { value: cookie } : undefined
      },
    },
  }
}

describe('local dashboard demo auth boundary', () => {
  it.each([
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    '[::1]',
    '[::1]:3000',
  ])('allows development requests on %s', (host) => {
    expect(isLoopbackDevelopment(requestLike(host), 'development')).toBe(true)
  })

  it.each(['top100.test', 'preview.top100.test', '192.168.1.25:3000'])('rejects non-loopback host %s', (host) => {
    expect(isLoopbackDevelopment(requestLike(host), 'development')).toBe(false)
  })

  it('rejects loopback requests outside development', () => {
    expect(isLoopbackDevelopment(requestLike('localhost:3000'), 'production')).toBe(false)
    expect(isLoopbackDevelopment(requestLike('localhost:3000'), 'test')).toBe(false)
  })

  it('classifies the exact temporary credentials as authenticated', () => {
    expect(classifyDemoCredentials(' demo@top100.local ', 'Top100Demo!2026')).toBe('authenticated')
  })

  it('handles a wrong password for the demo account without falling through', () => {
    expect(classifyDemoCredentials('demo@top100.local', 'wrong')).toBe('invalid-demo-password')
  })

  it('lets every other email continue to the normal auth provider', () => {
    expect(classifyDemoCredentials('member@example.com', 'anything')).toBe('not-demo')
  })

  it('accepts only the exact cookie on a loopback development request', () => {
    expect(
      hasValidDemoSession(
        requestLike('localhost:3000', DEV_DASHBOARD_COOKIE_VALUE),
        'development',
      ),
    ).toBe(true)
    expect(hasValidDemoSession(requestLike('localhost:3000', 'wrong'), 'development')).toBe(false)
    expect(
      hasValidDemoSession(
        requestLike('top100.test', DEV_DASHBOARD_COOKIE_VALUE),
        'development',
      ),
    ).toBe(false)
    expect(
      hasValidDemoSession(
        requestLike('localhost:3000', DEV_DASHBOARD_COOKIE_VALUE),
        'production',
      ),
    ).toBe(false)
  })
})
