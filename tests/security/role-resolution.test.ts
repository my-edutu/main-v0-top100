import { describe, expect, it } from 'vitest'

import { Role } from '@/lib/types/roles'
import { resolveAuthorizationRole } from '@/lib/auth-utils'

describe('authorization role resolution', () => {
  it('uses the database role when both sources exist', () => {
    expect(resolveAuthorizationRole(Role.ADMIN, Role.USER)).toBe(Role.USER)
    expect(resolveAuthorizationRole(Role.USER, Role.ADMIN)).toBe(Role.ADMIN)
  })

  it('falls back to the JWT role only when the database has no role', () => {
    expect(resolveAuthorizationRole(Role.ADMIN, null)).toBe(Role.ADMIN)
    expect(resolveAuthorizationRole(null, null)).toBeNull()
  })
})
