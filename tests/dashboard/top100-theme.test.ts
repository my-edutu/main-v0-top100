import { describe, expect, it } from 'vitest'

import { top100DashboardTheme } from '@/lib/dashboard/theme'

describe('Top100 dashboard theme', () => {
  it('keeps the homepage orange gradient and white surface system', () => {
    expect(top100DashboardTheme.canvas).toContain('linear-gradient')
    expect(top100DashboardTheme.canvas).toContain('#FFF')
    expect(top100DashboardTheme.activeNav).toContain('from-orange-500')
    expect(top100DashboardTheme.activeNav).toContain('to-amber-500')
    expect(top100DashboardTheme.card).toContain('white')
  })
})
