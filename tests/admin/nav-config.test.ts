import { describe, it, expect } from 'vitest'
import {
  navGroups,
  navItems,
  isNavItemActive,
  resolvePageTitle,
} from '@/app/admin/components/nav-config'

describe('navGroups', () => {
  it('exposes every route that used to be unreachable from the sidebar', () => {
    const hrefs = navItems.map((item) => item.href)

    for (const href of [
      '/admin/users',
      '/admin/homepage',
      '/admin/interviews',
      '/admin/invites',
      '/admin/member-posts',
      '/admin/opportunities',
    ]) {
      expect(hrefs).toContain(href)
    }
  })

  it('has no duplicate hrefs', () => {
    const hrefs = navItems.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('gives every item a distinct icon, so no two sections look alike', () => {
    const icons = navItems.map((item) => item.icon)
    expect(new Set(icons).size).toBe(icons.length)
  })

  it('does not link to /admin/groups, which has no page', () => {
    expect(navItems.map((item) => item.href)).not.toContain('/admin/groups')
  })

  it('labels every group except the leading one', () => {
    expect(navGroups[0].label).toBeNull()
    for (const group of navGroups.slice(1)) {
      expect(group.label).toBeTruthy()
    }
  })
})

describe('isNavItemActive', () => {
  it('matches /admin exactly so it does not light up everywhere', () => {
    expect(isNavItemActive('/admin', '/admin')).toBe(true)
    expect(isNavItemActive('/admin/blog', '/admin')).toBe(false)
  })

  it('matches a section and its descendants', () => {
    expect(isNavItemActive('/admin/blog', '/admin/blog')).toBe(true)
    expect(isNavItemActive('/admin/blog/new', '/admin/blog')).toBe(true)
    expect(isNavItemActive('/admin/blog/edit/123', '/admin/blog')).toBe(true)
  })

  it('only matches on a path segment boundary', () => {
    // Without the boundary check, /admin/member-hub would activate a
    // hypothetical /admin/member entry.
    expect(isNavItemActive('/admin/member-hub', '/admin/member')).toBe(false)
    expect(isNavItemActive('/admin/member-posts', '/admin/member')).toBe(false)
  })

  it('does not confuse sibling sections', () => {
    expect(isNavItemActive('/admin/awards', '/admin/awardees')).toBe(false)
    expect(isNavItemActive('/admin/awardees', '/admin/awards')).toBe(false)
  })

  it('handles a null pathname', () => {
    expect(isNavItemActive(null, '/admin/blog')).toBe(false)
  })
})

describe('resolvePageTitle', () => {
  it('names the current section', () => {
    expect(resolvePageTitle('/admin')).toBe('Overview')
    expect(resolvePageTitle('/admin/awardees')).toBe('Awardees')
  })

  it('names the section for a nested route rather than going blank', () => {
    expect(resolvePageTitle('/admin/blog/edit/123')).toBe('Editorial')
    expect(resolvePageTitle('/admin/awardees/import')).toBe('Awardees')
  })

  it('falls back for an unknown route', () => {
    expect(resolvePageTitle('/admin/does-not-exist')).toBe('Admin')
    expect(resolvePageTitle(null)).toBe('Admin')
  })
})
