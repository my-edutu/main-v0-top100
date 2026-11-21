import { describe, expect, it } from 'vitest'
import { deliveryReadiness } from '@/lib/programme-manager/budget'

describe('delivery readiness', () => {
  it('holds unknown costs and uncovered costs, even if an estimate exists', () => {
    expect(deliveryReadiness([{ essential: true, quoted: null, in_kind: 0 }], 100)).toEqual({ ready: false, shortfall: null })
    expect(deliveryReadiness([{ essential: true, quoted: 100, in_kind: 20 }], 79)).toEqual({ ready: false, shortfall: 1 })
  })
  it('counts confirmed in-kind only against its own cost and excludes nonessential costs', () => {
    expect(deliveryReadiness([{ essential: true, quoted: 100, in_kind: 150 }, { essential: true, quoted: 50, in_kind: 0 }, { essential: false, quoted: null, in_kind: 0 }], 50)).toEqual({ ready: true, shortfall: 0 })
    expect(deliveryReadiness([], 0)).toEqual({ ready: false, shortfall: null })
  })
})
