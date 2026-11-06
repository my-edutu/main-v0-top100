import { describe, expect, it } from 'vitest'
import { publicProfileSitemap } from '@/lib/seo/profile-sitemap'

describe('public profile sitemap', () => {
  it('loads profiles beyond a database page and deduplicates URLs', async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({ slug: `person-${i}`, updated_at: null }))
    rows.push({ slug: 'person-0', updated_at: null })
    const ranges: number[] = []
    const routes = await publicProfileSitemap(async (from, to) => {
      ranges.push(from)
      return { data: rows.slice(from, to + 1), error: null }
    })
    expect(ranges).toEqual([0, 500, 1000, 1002])
    expect(routes).toHaveLength(1001)
    expect(routes[1000].url).toContain('/awardees/person-1000')
    expect(routes[0]).not.toHaveProperty('lastModified')
  })
  it('handles server row caps smaller than the requested page size', async () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ slug: `member-${i}`, updated_at: 'invalid' }))
    const routes = await publicProfileSitemap(async (from) => ({ data: rows.slice(from, from + 2), error: null }))
    expect(routes).toHaveLength(7)
    expect(routes.every(route => !route.lastModified)).toBe(true)
  })
  it('fails instead of silently publishing partial results on query errors', async () => {
    await expect(publicProfileSitemap(async () => ({ data: null, error: { message: 'unavailable' } }))).rejects.toThrow('public profile sitemap')
  })
})
