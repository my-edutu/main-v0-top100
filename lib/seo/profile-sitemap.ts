import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

type ProfileRow = { slug: string | null; updated_at: string | null }
type LoadPage = (from: number, to: number) => PromiseLike<{
  data: ProfileRow[] | null
  error: { message: string } | null
}>

export async function publicProfileSitemap(loadPage: LoadPage): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = []
  const seen = new Set<string>()
  const pageSize = 500
  for (let offset = 0; ;) {
    const { data, error } = await loadPage(offset, offset + pageSize - 1)
    if (error || !data) throw new Error(`Could not generate public profile sitemap: ${error?.message || 'missing data'}`)
    if (data.length === 0) break
    for (const profile of data) {
      if (!profile.slug?.trim() || seen.has(profile.slug)) continue
      seen.add(profile.slug)
      const modified = profile.updated_at ? new Date(profile.updated_at) : null
      routes.push({
        url: `${SITE_URL}/awardees/${encodeURIComponent(profile.slug)}`,
        ...(modified && Number.isFinite(modified.getTime()) ? { lastModified: modified } : {}),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }
    // Advance by returned rows: self-hosted PostgREST may cap below 500.
    offset += data.length
  }
  return routes
}
