import { describe, expect, it } from 'vitest'

import { meNav, resolveDashboardTitle } from '@/app/dashboard/_lib/navigation'

describe('portfolio cover dashboard navigation', () => {
  it('exposes a dedicated portfolio cover destination under Me', () => {
    expect(meNav.some((item) => item.href === '/dashboard/me/portfolio-cover' && item.label === 'Portfolio cover')).toBe(true)
    expect(resolveDashboardTitle('/dashboard/me/portfolio-cover')).toBe('Portfolio cover')
  })
})
