import { afterEach, describe, expect, it, vi } from 'vitest'

import { extractRoleFromJWTPayload, extractRoleFromSession } from '@/lib/auth-utils'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('production auth role logging', () => {
  it('does not write member identity or app metadata to production logs', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    extractRoleFromSession({
      user: {
        id: 'member-id',
        email: 'member@example.com',
        app_metadata: { role: 'member', private_value: 'do-not-log' },
      },
    } as never)
    extractRoleFromJWTPayload({
      sub: 'member-id',
      email: 'member@example.com',
      app_metadata: { role: 'member', private_value: 'do-not-log' },
    })

    expect(log).not.toHaveBeenCalled()
  })
})
