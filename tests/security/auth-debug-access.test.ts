import { describe, expect, it } from 'vitest'

import { isAuthDebugEnabled } from '@/lib/auth/debug-access'

describe('auth debug access', () => {
  it('is enabled only for local development', () => {
    expect(isAuthDebugEnabled('development')).toBe(true)
    expect(isAuthDebugEnabled('test')).toBe(false)
    expect(isAuthDebugEnabled('production')).toBe(false)
  })
})
