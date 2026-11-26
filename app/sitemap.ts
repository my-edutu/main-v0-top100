import type { MetadataRoute } from 'next'
import { unstable_cache } from 'next/cache'
import { connection } from 'next/server'
import { createClient } from '@supabase/supabase-js'

import { getPublishedPosts } from '@/lib/posts/server'
import { getPublishedSlugs } from '@/lib/interviews/queries'
import { SITE_URL } from '@/lib/site'
import { talentDiscoveryEnabled } from '@/lib/talent/features'
import { publicProfileSitemap } from '@/lib/seo/profile-sitemap'

const getSitemap = unstable_cache(async (): Promise<MetadataRoute.Sitemap> => {
  const baseUrl = SITE_URL

  // The sitemap reads public data without a visitor session.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Static routes with priority
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/awardees`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/interviews`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reports/back-in-class`,
      lastModified: new Date('2026-11-26'),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/reports/beyond-recognition`,
      lastModified: new Date('2026-11-25'),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/reports/opportunity-2027`,
      lastModified: new Date('2026-11-25'),
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/initiatives`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/initiatives/project100`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/initiatives/talk100-live`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/initiatives/summit`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/initiatives/opportunities`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/get-started`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // /apply/awardee is intentionally absent: it now redirects to the awardee
    // Google Form, and search engines drop redirecting URLs listed in a sitemap.
    // /get-started and /apply are the indexable awardee entry points.
    {
      url: `${baseUrl}/apply/ambassador`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/partnership`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/waitlist`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/apply/volunteer`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/magazine`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/magazine/afl2025`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/join`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  if (talentDiscoveryEnabled()) {
    staticRoutes.push({ url: `${baseUrl}/for-organisations` })
  }

  // Use stable pages to avoid PostgREST's per-response row limit.
  const awardeeRoutes = await publicProfileSitemap((from, to) => supabase
    .from('awardee_directory')
    .select('slug, updated_at')
    .eq('is_public', true)
    .order('slug', { ascending: true })
    .order('awardee_id', { ascending: true })
    .range(from, to))

  // getPublishedPosts merges Supabase posts with the static seed posts in
  // content/data — querying Supabase directly here used to leave the static
  // posts out of the sitemap entirely.
  const posts = await getPublishedPosts()

  const blogRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.createdAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  const interviewSlugs = await getPublishedSlugs()

  const interviewRoutes: MetadataRoute.Sitemap = interviewSlugs.map((interview) => ({
    url: `${baseUrl}/interviews/${interview.slug}`,
    lastModified: interview.published_at ? new Date(interview.published_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...awardeeRoutes, ...blogRoutes, ...interviewRoutes]
}, ['public-sitemap'], { revalidate: 3600 })

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // CI can compile the route without production database credentials.
  await connection()
  return getSitemap()
}
