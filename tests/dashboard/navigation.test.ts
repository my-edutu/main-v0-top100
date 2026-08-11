import { describe, expect, it } from 'vitest'
import {
  primaryDashboardNav,
  discoverNav,
  meNav,
  isDashboardNavActive,
  resolveDashboardTitle,
} from '@/app/dashboard/_lib/navigation'
import { legacySectionDestination } from '@/app/dashboard/_lib/legacy-sections'

describe('dashboard navigation', () => {
  it('exposes exactly the approved four mobile destinations', () => {
    expect(primaryDashboardNav.map(({ label }) => label)).toEqual([
      'Home', 'Discover', 'Messages', 'Me',
    ])
  })

  it('gives every primary destination an accessible identity and approved category color', () => {
    const allowedColors = new Set([
      'ember', 'saffron', 'forest', 'cobalt', 'burgundy', 'charcoal',
    ])

    expect(primaryDashboardNav).toHaveLength(4)
    expect(new Set(primaryDashboardNav.map(({ href }) => href)).size).toBe(4)
    primaryDashboardNav.forEach(({ label, href, icon, color }) => {
      expect(label.trim()).not.toBe('')
      expect(href).toMatch(/^\/dashboard(?:\/|$)/)
      expect(icon).toBeTypeOf('object')
      expect(allowedColors.has(color)).toBe(true)
    })
    expect(primaryDashboardNav.map(({ label, color }) => [label, color])).toEqual([
      ['Home', 'ember'],
      ['Discover', 'saffron'],
      ['Messages', 'cobalt'],
      ['Me', 'burgundy'],
    ])
  })

  it('groups discovery and account work without duplicate hrefs', () => {
    expect(discoverNav.map(({ label }) => label)).toEqual([
      'Members', 'Groups', 'Opportunities', 'Saved', 'Events', 'Magazine',
    ])
    expect(meNav.map(({ label }) => label)).toEqual([
      'Profile', 'My award', 'Posts', 'Get featured', 'Settings',
    ])
    const hrefs = [...primaryDashboardNav, ...discoverNav, ...meNav].map(({ href }) => href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('matches descendants without activating Home everywhere', () => {
    expect(isDashboardNavActive('/dashboard', '/dashboard')).toBe(true)
    expect(isDashboardNavActive('/dashboard/discover/events', '/dashboard/discover')).toBe(true)
    expect(isDashboardNavActive('/dashboard/messages/abc', '/dashboard/messages')).toBe(true)
    expect(isDashboardNavActive('/dashboard/me/profile', '/dashboard')).toBe(false)
  })

  it('resolves nested titles and every legacy section', () => {
    expect(resolveDashboardTitle('/dashboard/me/award')).toBe('My award')
    expect(legacySectionDestination('directory')).toBe('/dashboard/discover/members')
    expect(legacySectionDestination('awards')).toBe('/dashboard/me/award')
    expect(legacySectionDestination('partnerships')).toBe('/partnership')
    expect(legacySectionDestination('unknown')).toBe('/dashboard')
  })
})
