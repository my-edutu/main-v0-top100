import { describe, expect, it } from 'vitest'

import { top100DashboardTheme } from '@/lib/dashboard/theme'

describe('Top100 dashboard theme', () => {
  it('keeps a yellow-gradient and white surface system', () => {
    expect(top100DashboardTheme.canvas).toContain('linear-gradient')
    expect(top100DashboardTheme.canvas).toContain('#FFF')
    expect(top100DashboardTheme.activeNav).toContain('yellow')
    expect(top100DashboardTheme.card).toContain('white')
  })
})
