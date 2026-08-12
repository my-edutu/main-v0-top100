import { describe, expect, it } from 'vitest'

import { awardReturnPath } from '@/lib/awards/return-url'

describe('award return path', () => {
  it('returns payment completion to the routed award page', () => {
    expect(awardReturnPath({ paymentDone: true })).toBe(
      '/dashboard/me/award?payment=done',
    )
    expect(awardReturnPath({ paymentDone: true, demo: true })).toBe(
      '/dashboard/me/award?payment=done&demo=1',
    )
  })

  it('omits query parameters that are not active', () => {
    expect(awardReturnPath({ paymentDone: false })).toBe('/dashboard/me/award')
  })
})
