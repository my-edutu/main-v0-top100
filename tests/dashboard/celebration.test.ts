import { describe, expect, it } from 'vitest'
import { shouldShowDashboardCelebration } from '../../lib/dashboard/celebration'

describe('dashboard first-visit celebration', () => {
  it('shows only on the first dashboard visit when it has not been dismissed', () => {
    expect(shouldShowDashboardCelebration(1, false)).toBe(true)
    expect(shouldShowDashboardCelebration(1, true)).toBe(false)
    expect(shouldShowDashboardCelebration(2, false)).toBe(false)
    expect(shouldShowDashboardCelebration(0, false)).toBe(false)
  })
})
